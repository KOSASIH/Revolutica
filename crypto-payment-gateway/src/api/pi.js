require('dotenv').config();
const PiNetwork = require('pi-backend');
const StellarSdk = require('stellar-sdk');
const axios = require('axios');
const fs = require('fs').promises;

const PI_API_KEY = process.env.PI_API_KEY;
const PI_WALLET_PRIVATE_SEED = process.env.PI_WALLET_PRIVATE_SEED;
const PI_NETWORK = process.env.PI_NETWORK || 'Pi Testnet';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/quantum-pay.log';

// Initialize Pi SDK
const pi = new PiNetwork(PI_API_KEY, PI_WALLET_PRIVATE_SEED);

// Logging function
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - PiNetwork: ${message}\n`;
  await fs.appendFile(LOG_FILE_PATH, logMessage);
  console.log(logMessage);
}

// Create and process A2U payment
async function processPiPayment(orderId, amount, userUid, memo = 'QuantumPay Payment') {
  try {
    // Validate inputs
    if (!orderId || !amount || !userUid) {
      throw new Error('Missing required parameters: orderId, amount, userUid');
    }

    // Create payment data
    const paymentData = {
      amount: parseFloat(amount),
      memo,
      metadata: { orderId },
      uid: userUid,
    };

    // Store payment data (in a real app, use a database)
    await log(`Creating payment for order ${orderId}: ${JSON.stringify(paymentData)}`);

    // Step 1: Create payment via Pi backend
    const paymentResponse = await pi.createPayment(paymentData);
    const paymentId = paymentResponse.identifier;
    await log(`Created payment for order ${orderId}: Payment ID ${paymentId}`);

    // Step 2: Submit payment to Pi Blockchain
    const txid = await pi.submitPayment(paymentId);
    await log(`Submitted payment to Pi Blockchain for order ${orderId}: TxID ${txid}`);

    // Step 3: Complete payment
    const completeResponse = await pi.completePayment(paymentId, txid);
    if (!completeResponse.status.developer_completed) {
      throw new Error('Payment completion failed');
    }
    await log(`Completed payment for order ${orderId}: ${JSON.stringify(completeResponse)}`);

    return {
      status: 'SUCCESS',
      paymentId,
      txid,
      amount: paymentData.amount,
      network: PI_NETWORK,
    };
  } catch (error) {
    await log(`Pi payment processing failed for order ${orderId}: ${error.message}`);
    return { status: 'FAILURE', error: error.message };
  }
}

// Main function for CLI testing
async function main(orderId, amount, userUid) {
  try {
    const result = await processPiPayment(orderId, amount, userUid);
    console.log(JSON.stringify(result));
  } catch (error) {
    await log(`Main process failed: ${error.message}`);
    console.log(JSON.stringify({ status: 'FAILURE', error: error.message }));
  }
}

// Command-line interface
if (require.main === module) {
  const [,, orderId, amount, userUid] = process.argv;
  if (!orderId || !amount || !userUid) {
    console.error('Usage: node pi.js <orderId> <amount> <userUid>');
    process.exit(1);
  }
  main(orderId, parseFloat(amount), userUid);
}

module.exports = { processPiPayment };
