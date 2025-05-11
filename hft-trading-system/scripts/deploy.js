const hre = require('hardhat');
require('dotenv').config();

async function main() {
    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log('Deploying contracts with account:', deployer.address);

    // Get treasury address from .env or use deployer as fallback
    const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
    console.log('Treasury address:', treasuryAddress);

    // Get contract factory for PiCoinContracts
    const PiCoinContracts = await hre.ethers.getContractFactory('PiCoinContracts');

    // Deploy the contract
    const contract = await PiCoinContracts.deploy(treasuryAddress);
    await contract.deployed();

    // Log deployment details
    console.log('PiCoinContracts deployed to:', contract.address);
    console.log('Network:', hre.network.name);
}

// Execute deployment and handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });
