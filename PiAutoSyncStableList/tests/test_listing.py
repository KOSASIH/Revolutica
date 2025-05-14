import pytest
from web3 import Web3
from eth_account import Account
import json
import os
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Configuration
NETWORK_URL = os.getenv("NETWORK_URL", "http://127.0.0.1:8545")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
AUTO_LISTING_ADDRESS = os.getenv("AUTO_LISTING_CONTRACT_ADDRESS")
CROSS_CHAIN_BRIDGE_ADDRESS = os.getenv("CROSS_CHAIN_BRIDGE_CONTRACT_ADDRESS")
PRICE_ORACLE_ADDRESS = os.getenv("PRICE_ORACLE_CONTRACT_ADDRESS")
COMPLIANCE_REGISTRY_ADDRESS = os.getenv("COMPLIANCE_REGISTRY_CONTRACT_ADDRESS")

# Mock ABI (replace with actual ABI from compiled contracts)
AUTO_LISTING_ABI = json.load(open("build/contracts/AutoListing.json"))["abi"]
CROSS_CHAIN_BRIDGE_ABI = json.load(open("build/contracts/CrossChainBridge.json"))["abi"]
PRICE_ORACLE_ABI = [{"inputs": [], "name": "getPrice", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"}]
COMPLIANCE_REGISTRY_ABI = [{"inputs": [{"type": "address"}], "name": "isCompliant", "outputs": [{"type": "bool"}], "stateMutability": "view", "type": "function"}]

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(NETWORK_URL))
account = Account.from_key(PRIVATE_KEY)

@pytest.fixture
def auto_listing_contract():
    return w3.eth.contract(address=AUTO_LISTING_ADDRESS, abi=AUTO_LISTING_ABI)

@pytest.fixture
def cross_chain_bridge_contract():
    return w3.eth.contract(address=CROSS_CHAIN_BRIDGE_ADDRESS, abi=CROSS_CHAIN_BRIDGE_ABI)

@pytest.fixture
def price_oracle_contract():
    return w3.eth.contract(address=PRICE_ORACLE_ADDRESS, abi=PRICE_ORACLE_ABI)

@pytest.fixture
def compliance_registry_contract():
    return w3.eth.contract(address=COMPLIANCE_REGISTRY_ADDRESS, abi=COMPLIANCE_REGISTRY_ABI)

def test_register_exchange(auto_listing_contract):
    """Test registering a new exchange with ZK-proof."""
    exchange_address = w3.eth.accounts[1]
    zk_proof = b"mock_zk_proof"  # Replace with actual ZK-proof
    public_inputs = b"mock_public_inputs"

    tx = auto_listing_contract.functions.registerExchange(exchange_address, zk_proof, public_inputs).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 2000000,
        "gasPrice": w3.to_wei("20", "gwei")
    })
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)

    exchange = auto_listing_contract.functions.exchanges(exchange_address).call()
    assert exchange[1] == True  # isSupported should be true

def test_create_listing_proposal(auto_listing_contract):
    """Test creating a listing proposal."""
    exchange_address = w3.eth.accounts[1]
    coin_symbol = "PI"

    # Ensure exchange is registered
    auto_listing_contract.functions.registerExchange(exchange_address, b"mock_zk_proof", b"mock_public_inputs").transact({"from": account.address})

    tx = auto_listing_contract.functions.createListingProposal(exchange_address, coin_symbol).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 2000000,
        "gasPrice": w3.to_wei("20", "gwei")
    })
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)

    proposal_id = auto_listing_contract.functions.proposalCount().call()
    proposal = auto_listing_contract.functions.proposals(proposal_id).call()
    assert proposal[0] == exchange_address
    assert proposal[1] == coin_symbol
    assert proposal[2] == 314159 * 10**18  # FIXED_VALUE

def test_vote_and_execute_listing(auto_listing_contract, price_oracle_contract, compliance_registry_contract):
    """Test voting on a proposal and executing listing."""
    exchange_address = w3.eth.accounts[1]
    coin_symbol = "PI"

    # Mock price oracle and compliance registry
    # Assume price_oracle.getPrice() returns FIXED_VALUE
    # Assume compliance_registry.isCompliant() returns true

    # Create proposal
    auto_listing_contract.functions.createListingProposal(exchange_address, coin_symbol).transact({"from": account.address})
    proposal_id = auto_listing_contract.functions.proposalCount().call()

    # Vote multiple times to meet MIN_VOTE_THRESHOLD
    for i in range(2, 102):  # Assuming MIN_VOTE_THRESHOLD = 100
        voter = w3.eth.accounts[i]
        tx = auto_listing_contract.functions.voteOnProposal(proposal_id).build_transaction({
            "from": voter,
            "nonce": w3.eth.get_transaction_count(voter),
            "gas": 2000000,
            "gasPrice": w3.to_wei("20", "gwei")
        })
        signed_tx = w3.eth.account.sign_transaction(tx, w3.eth.accounts[i].private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        w3.eth.wait_for_transaction_receipt(tx_hash)

    proposal = auto_listing_contract.functions.proposals(proposal_id).call()
    assert proposal[3] >= 100  # voteCount >= MIN_VOTE_THRESHOLD
    assert proposal[4] == True  # executed

def test_bridge_listing_data(cross_chain_bridge_contract):
    """Test bridging listing data to a target chain."""
    chain_id = 100  # Stellar chain ID
    exchange_address = w3.eth.accounts[1]
    coin_symbol = "PI"
    fixed_value = 314159 * 10**18
    signature = w3.eth.account.sign_message(
        w3.eth.account.message.encode_defunct(w3.keccak(text=f"{chain_id}{exchange_address}{coin_symbol}{fixed_value}")),
        private_key=PRIVATE_KEY
    ).signature

    # Register chain
    cross_chain_bridge_contract.functions.registerChain(chain_id, w3.eth.accounts[2], b"mock_zk_proof", b"mock_public_inputs").transact({"from": account.address})

    tx = cross_chain_bridge_contract.functions.bridgeListingData(chain_id, exchange_address, coin_symbol, fixed_value, signature).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 2000000,
        "gasPrice": w3.to_wei("20", "gwei")
    })
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)

    request_id = w3.keccak(text=f"{chain_id}{exchange_address}{coin_symbol}{int(time.time())}{cross_chain_bridge_contract.functions.requestCount().call()}")
    request = cross_chain_bridge_contract.functions.listingRequests(request_id).call()
    assert request[0] == exchange_address
    assert request[1] == coin_symbol
    assert request[2] == fixed_value
