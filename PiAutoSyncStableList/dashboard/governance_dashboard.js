import Web3 from 'web3';

const web3 = new Web3('http://localhost:8545');
const contractAddress = '0x...'; // Ganti dengan alamat smart contract

async function loadProposals() {
    const contract = new web3.eth.Contract(ABI, contractAddress);
    const proposals = await contract.methods.getProposals().call();
    document.getElementById('proposals').innerHTML = proposals.map(p => `<li>${p}</li>`).join('');
}

document.getElementById('vote').addEventListener('click', async () => {
    const accounts = await web3.eth.getAccounts();
    const contract = new web3.eth.Contract(ABI, contractAddress);
    await contract.methods.vote(proposalId).send({ from: accounts[0] });
});
