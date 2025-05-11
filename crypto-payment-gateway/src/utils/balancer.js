require('dotenv').config();
const Web3 = require('web3');
const fs = require('fs').promises;
const { optimizeExchange } = require('../api/ai.js');
const { generateTransactionId } = require('../api/quantum.js');

// Load environment variables
const ETH_NODE_URL = process.env.ETH_NODE_URL;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/quantum-pay.log';

// Validate environment variables
const requiredEnv = ['ETH_NODE_URL', 'TREASURY_ADDRESS', 'PRIVATE_KEY'];
for (const env of requiredEnv) {
  if (!process.env[env]) {
    throw new Error(`Missing environment variable: ${env}`);
  }
}

// Initialize Web3
const web3 = new Web3(ETH_NODE_URL);
const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

// Logging function
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - Balancer: ${message}\n`;
  await fs.appendFile(LOG_FILE_PATH, logMessage);
  console.log(logMessage);
}

// Allocate transaction fee to treasury
async function allocateFee(orderId, amount, crypto, feePercentage = 0.01) {
  try {
    // Simulate exchange data (replace with real data from ccxt.js)
    const exchangesData = [
      { name: 'binance', gasPrice: 20, liquidity: 1000000, feeRate: 0.001, volatility: 0.05 },
      { name: 'kraken', gasPrice: 25, liquidity: 800000, feeRate: 0.002, volatility: 0.06 },
    ];

    // Optimize allocation using AI
    const { exchange } = await optimizeExchange(orderId, amount, crypto, exchangesData);
    await log(`Selected exchange for allocation: ${exchange}`);

    // Calculate fee
    const feeAmount = amount * feePercentage;
    const netAmount = amount - feeAmount;

    // Generate quantum transaction ID
    const transactionId = await generateTransactionId(orderId);

    // Interact with PaymentProcessor.sol
    const contractAddress = '0xYourDeployedPaymentProcessorAddress'; // Update after deployment
    const abi = require('../../artifacts/contracts/PaymentProcessor.sol/PaymentProcessor.json').abi;
    const contract = new web3.eth.Contract(abi, contractAddress);

    const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC on Ethereum
    const amountInWei = web3.utils.toWei(feeAmount.toString(), 'mwei'); // USDC has 6 decimals

    const data = contract.methods.processPayment(tokenAddress, amountInWei).encodeABI();
    const tx = {
      from: account.address,
      to: contractAddress,
      data,
      gas: 200000,
      gasPrice: web3.utils.toWei('20', 'gwei'),
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    await log(`Allocated ${feeAmount} USDC to treasury for order ${orderId}: Tx ${receipt.transactionHash}`);
    return { status: 'SUCCESS', transactionId, feeAmount, netAmount, txHash: receipt.transactionHash };
  } catch (error) {
    await log(`Fee allocation failed: ${error.message}`);
    return { status: 'FAILURE', error: error.message };
  }
}

// Main function to handle balancer operations
async function main(orderId, amount, crypto) {
  try {
    const result = await allocateFee(orderId, amount, crypto);
    console.log(JSON.stringify(result));
    return result;
  } catch (error) {
    const result = { status: 'FAILURE', error: error.message };
    await log(`Balancer operation failed: ${error.message}`);
    console.log(JSON.stringify(result));
    return result;
  }
}

// Command-line interface for PHP integration
if (require.main === module) {
  const [,, orderId, amount, crypto] = process.argv;
  if (!orderId || !amount || !crypto) {
    console.error('Usage: node balancer.js <orderId> <amount> <crypto>');
    process.exit(1);
  }
  main(orderId, parseFloat(amount), crypto);
}

module.exports = { allocateFee };
