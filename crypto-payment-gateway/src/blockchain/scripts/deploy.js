const hre = require('hardhat');
require('dotenv').config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  console.log('Treasury address:', treasuryAddress);

  const PaymentProcessor = await hre.ethers.getContractFactory('PaymentProcessor');
  const contract = await PaymentProcessor.deploy(treasuryAddress);
  await contract.deployed();

  console.log('PaymentProcessor deployed to:', contract.address);
  console.log('Network:', hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
