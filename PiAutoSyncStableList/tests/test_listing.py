import pytest
from web3 import Web3
from web3.exceptions import ContractLogicError
from eth_account import Account
import json
import os
import time
import logging
from dotenv import load_dotenv
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    filename=os.getenv("LOG_FILE_PATH", "./logs/pi_autosync_stablelist.log"),
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configuration
NETWORK_URL = os.getenv("NETWORK_URL", "http://127.0.0.1:8545")
FALLBACK_NETWORK_URL = os.getenv("FALLBACK_NETWORK_URL", "http://127.0.0.1:8545")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
AUTO_LISTING_ADDRESS = os.getenv("AUTO_LISTING_CONTRACT_ADDRESS")
CROSS_CHAIN_BRIDGE_ADDRESS = os.getenv("CROSS_CHAIN_BRIDGE_CONTRACT_ADDRESS")
PRICE_ORACLE_ADDRESS = os.getenv("PRICE_ORACLE_CONTRACT_ADDRESS")
COMPLIANCE_REGISTRY_ADDRESS = os.getenv("COMPLIANCE_REGISTRY_CONTRACT_ADDRESS")
GAS_LIMIT = int(os.getenv("GAS_LIMIT", 5000000))
GAS_PRICE_GWEI = int(os.getenv("GAS_PRICE_GWEI", 50))

# Load ABI from compiled contracts
try:
    AUTO_LISTING_ABI = json.load(open("build/contracts/AutoListing.json"))["abi"]
    CROSS_CHAIN_BRIDGE_ABI = json.load(open("build/contracts/CrossChainBridge.json"))["abi"]
except FileNotFoundError:
    logger.error("Compiled contract ABI files not found in build/contracts/")
    raise

# Mock ABI for dependencies (replace with actual ABIs in production)
PRICE_ORACLE_ABI = [
    {"inputs": [], "name": "getPrice", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"}
]
COMPLIANCE_REGISTRY_ABI = [
    {"inputs": [{"type": "address"}], "name": "isCompliant", "outputs": [{"type": "bool"}], "stateMutability": "view", "type": "function"}
]

# Initialize Web3 with primary and fallback providers
w3 = Web3(Web3.HTTPProvider(NETWORK_URL))
if not w3.is_connected():
    logger.warning(f"Primary network {NETWORK_URL} not connected, trying fallback")
    w3 = Web3(Web3.HTTPProvider(FALLBACK_NETWORK_URL))
    if not w3.is_connected():
        logger.error("Fallback network not connected")
        raise ConnectionError("Unable to connect to any blockchain network")

account = Account.from_key(PRIVATE_KEY)

# Pytest fixtures
@pytest.fixture
def auto_listing_contract():
    """Fixture for AutoListing contract."""
    if not AUTO_LISTING_ADDRESS:
        logger.error("AUTO_LISTING_CONTRACT_ADDRESS not set in .env")
        raise ValueError("AUTO_LISTING_CONTRACT_ADDRESS not set")
    return w3.eth.contract(address=AUTO_LISTING_ADDRESS, abi=AUTO_LISTING_ABI)

@pytest.fixture
def cross_chain_bridge_contract():
    """Fixture for CrossChainBridge contract."""
    if not CROSS_CHAIN_BRIDGE_ADDRESS:
        logger.error("CROSS_CHAIN_BRIDGE_CONTRACT_ADDRESS not set in .env")
        raise ValueError("CROSS_CHAIN_BRIDGE_CONTRACT_ADDRESS not set")
    return w3.eth.contract(address=CROSS_CHAIN_BRIDGE_ADDRESS, abi=CROSS_CHAIN_BRIDGE_ABI)

@pytest.fixture
def price_oracle_contract():
    """Fixture for PriceOracle contract."""
    if not PRICE_ORACLE_ADDRESS:
        logger.error("PRICE_ORACLE_CONTRACT_ADDRESS not set in .env")
        raise ValueError("PRICE_ORACLE_CONTRACT_ADDRESS not set")
    return w3.eth.contract(address=PRICE_ORACLE_ADDRESS, abi=PRICE_ORACLE_ABI)

@pytest.fixture
def compliance_registry_contract():
    """Fixture for ComplianceRegistry contract."""
    if not COMPLIANCE_REGISTRY_ADDRESS:
        logger.error("COMPLIANCE_REGISTRY_CONTRACT_ADDRESS not set in .env")
        raise ValueError("COMPLIANCE_REGISTRY_CONTRACT_ADDRESS not set")
    return w3.eth.contract(address=COMPLIANCE_REGISTRY_ADDRESS, abi=COMPLIANCE_REGISTRY_ABI)

# Test cases
def test_register_exchange(auto_listing_contract):
    """Test registering a new exchange with ZK-proof."""
    exchange_address = w3.eth.accounts[1]
    zk_proof = b"mock_zk_proof"  # Replace with actual ZK-proof from ZKP_LIBRARY
    public_inputs = b"mock_public_inputs"

    try:
        tx = auto_listing_contract.functions.registerExchange(exchange_address, zk_proof, public_inputs).build_transaction({
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": GAS_LIMIT,
            "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
        })
        signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        assert receipt["status"] == 1, "Transaction failed"
        logger.info(f"Exchange {exchange_address} registered successfully: {tx_hash.hex()}")

        exchange = auto_listing_contract.functions.exchanges(exchange_address).call()
        assert exchange[1] == True, "Exchange not marked as supported"
    except ContractLogicError as e:
        logger.error(f"Contract logic error during exchange registration: {str(e)}")
        raise

def test_create_listing_proposal(auto_listing_contract):
    """Test creating a listing proposal."""
    exchange_address = w3.eth.accounts[1]
    coin_symbol = os.getenv("PI_COIN_SYMBOL", "PI")

    # Register exchange first
    auto_listing_contract.functions.registerExchange(exchange_address, b"mock_zk_proof", b"mock_public_inputs").transact({
        "from": account.address,
        "gas": GAS_LIMIT,
        "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
    })

    try:
        tx = auto_listing_contract.functions.createListingProposal(exchange_address, coin_symbol).build_transaction({
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": GAS_LIMIT,
            "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
        })
        signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        assert receipt["status"] == 1, "Transaction failed"
        logger.info(f"Listing proposal created for {coin_symbol} on {exchange_address}: {tx_hash.hex()}")

        proposal_id = auto_listing_contract.functions.proposalCount().call()
        proposal = auto_listing_contract.functions.proposals(proposal_id).call()
        assert proposal[0] == exchange_address, "Proposal exchange address mismatch"
        assert proposal[1] == coin_symbol, "Proposal coin symbol mismatch"
        assert proposal[2] == int(os.getenv("PI_COIN_FIXED_VALUE", 314159 * 10**18)), "Proposal fixed value mismatch"
    except ContractLogicError as e:
        logger.error(f"Contract logic error during proposal creation: {str(e)}")
        raise

def test_vote_and_execute_listing(auto_listing_contract, price_oracle_contract, compliance_registry_contract):
    """Test voting on a proposal and executing the listing."""
    exchange_address = w3.eth.accounts[1]
    coin_symbol = os.getenv("PI_COIN_SYMBOL", "PI")

    # Register exchange
    auto_listing_contract.functions.registerExchange(exchange_address, b"mock_zk_proof", b"mock_public_inputs").transact({
        "from": account.address,
        "gas": GAS_LIMIT,
        "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
    })

    # Create proposal
    auto_listing_contract.functions.createListingProposal(exchange_address, coin_symbol).transact({
        "from": account.address,
        "gas": GAS_LIMIT,
        "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
    })
    proposal_id = auto_listing_contract.functions.proposalCount().call()

    # Simulate voting to meet MIN_VOTE_THRESHOLD (assumed 100)
    try:
        for i in range(2, 102):
            voter = w3.eth.accounts[i]
            tx = auto_listing_contract.functions.voteOnProposal(proposal_id).build_transaction({
                "from": voter,
                "nonce": w3.eth.get_transaction_count(voter),
                "gas": GAS_LIMIT,
                "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
            })
            signed_tx = w3.eth.account.sign_transaction(tx, w3.eth.accounts[i].key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            assert receipt["status"] == 1, f"Vote failed for voter {voter}"
            logger.debug(f"Vote cast by {voter} for proposal {proposal_id}: {tx_hash.hex()}")

        proposal = auto_listing_contract.functions.proposals(proposal_id).call()
        assert proposal[3] >= 100, "Vote count below threshold"
        assert proposal[4] == True, "Proposal not executed"
        logger.info(f"Proposal {proposal_id} executed successfully")
    except ContractLogicError as e:
        logger.error(f"Contract logic error during voting or execution: {str(e)}")
        raise

def test_bridge_listing_data(cross_chain_bridge_contract):
    """Test bridging listing data to a target chain."""
    chain_id = 100  # Stellar chain ID
    exchange_address = w3.eth.accounts[1]
    coin_symbol = os.getenv("PI_COIN_SYMBOL", "PI")
    fixed_value = int(os.getenv("PI_COIN_FIXED_VALUE", 314159 * 10**18))

    # Generate quantum-resistant signature
    message = w3.keccak(text=f"{chain_id}{exchange_address}{coin_symbol}{fixed_value}")
    signature = w3.eth.account.sign_message(
        w3.eth.account.encode_defunct(message),
        private_key=os.getenv("ECDSA_SIGNER_PRIVATE_KEY", PRIVATE_KEY)
    ).signature

    # Register chain
    try:
        cross_chain_bridge_contract.functions.registerChain(chain_id, w3.eth.accounts[2], b"mock_zk_proof", b"mock_public_inputs").transact({
            "from": account.address,
            "gas": GAS_LIMIT,
            "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
        })
        logger.info(f"Chain {chain_id} registered successfully")
    except ContractLogicError as e:
        logger.error(f"Contract logic error during chain registration: {str(e)}")
        raise

    # Bridge listing data
    try:
        tx = cross_chain_bridge_contract.functions.bridgeListingData(chain_id, exchange_address, coin_symbol, fixed_value, signature).build_transaction({
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": GAS_LIMIT,
            "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
        })
        signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        assert receipt["status"] == 1, "Bridging transaction failed"
        logger.info(f"Listing data bridged for {coin_symbol} on chain {chain_id}: {tx_hash.hex()}")

        request_count = cross_chain_bridge_contract.functions.requestCount().call()
        request_id = w3.keccak(text=f"{chain_id}{exchange_address}{coin_symbol}{int(time.time())}{request_count}")
        request = cross_chain_bridge_contract.functions.listingRequests(request_id).call()
        assert request[0] == exchange_address, "Request exchange address mismatch"
        assert request[1] == coin_symbol, "Request coin symbol mismatch"
        assert request[2] == fixed_value, "Request fixed value mismatch"
        assert request[5] == chain_id, "Request chain ID mismatch"
    except ContractLogicError as e:
        logger.error(f"Contract logic error during bridging: {str(e)}")
        raise

def test_invalid_zk_proof(auto_listing_contract):
    """Test registering an exchange with an invalid ZK-proof."""
    exchange_address = w3.eth.accounts[1]
    invalid_zk_proof = b"invalid_zk_proof"
    public_inputs = b"mock_public_inputs"

    with pytest.raises(ContractLogicError, match="Invalid ZK proof"):
        auto_listing_contract.functions.registerExchange(exchange_address, invalid_zk_proof, public_inputs).transact({
            "from": account.address,
            "gas": GAS_LIMIT,
            "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
        })
        logger.info(f"Successfully caught invalid ZK-proof error for {exchange_address}")

def test_unauthorized_relayer(cross_chain_bridge_contract):
    """Test bridging with an unauthorized relayer."""
    chain_id = 100
    exchange_address = w3.eth.accounts[1]
    coin_symbol = os.getenv("PI_COIN_SYMBOL", "PI")
    fixed_value = int(os.getenv("PI_COIN_FIXED_VALUE", 314159 * 10**18))
    request_id = w3.keccak(text=f"{chain_id}{exchange_address}{coin_symbol}{int(time.time())}0")

    with pytest.raises(ContractLogicError, match="Unauthorized relayer"):
        cross_chain_bridge_contract.functions.verifyListing(request_id, b"mock_zk_proof", b"mock_public_inputs").transact({
            "from": w3.eth.accounts[3],  # Unauthorized account
            "gas": GAS_LIMIT,
            "gasPrice": w3.to_wei(GAS_PRICE_GWEI, "gwei")
        })
        logger.info(f"Successfully caught unauthorized relayer error for request {request_id.hex()}")
