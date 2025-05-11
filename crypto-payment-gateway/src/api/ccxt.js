require('dotenv').config();
const ccxt = require('ccxt');
const Web3 = require('web3');
const fs = require('fs').promises;

// Load environment variables
const CCXT_API_KEY = process.env.CCXT_API_KEY;
const CCXT_API_SECRET = process.env.CCXT_API_SECRET;
const ETH_NODE_URL = process.env.ETH_NODE_URL;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/quantum-pay.log';

// Validate environment variables
const requiredEnv = ['CCXT_API_KEY', 'CCXT_API_SECRET', 'ETH_NODE_URL', 'TREASURY_ADDRESS'];
for (const env of requiredEnv) {
  if (!process.env[env]) {
    throw new Error(`Missing environment variable: ${env}`);
  }
}

// Initialize exchanges (Binance, Kraken, Coinbase Pro)
const exchanges = {
  binance: new ccxt.binance({
    apiKey: CCXT_API_KEY,
    secret: CCXT_API_SECRET,
    enableRateLimit: true,
  }),
  kraken: new ccxt.kraken({
    apiKey: CCXT_API_KEY,
    secret: CCXT_API_SECRET,
    enableRateLimit: true,
  }),
  coinbasepro: new ccxt.coinbasepro({
    apiKey: CCXT_API_KEY,
    secret: CCXT_API_SECRET,
    enableRateLimit: true,
  }),
};

// Initialize Web3 for on-chain payments
const web3 = new Web3(ETH_NODE_URL);

// Logging function
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  await fs.appendFile(LOG_FILE_PATH, logMessage);
  console.log(logMessage);
}

// Fetch price quote for a cryptocurrency
async function getPriceQuote(crypto, fiat = 'USD') {
  try {
    const symbol = `${crypto}/${fiat}`;
    let bestPrice = null;
    let bestExchange = null;

    for (const [name, exchange] of Object.entries(exchanges)) {
      if (exchange.has['fetchTicker']) {
        const ticker = await exchange.fetchTicker(symbol);
        const price = ticker.last;
        if (!bestPrice || price < bestPrice) {
          bestPrice = price;
          bestExchange = name;
        }
        await log(`Fetched price from ${name}: ${crypto}/${fiat} = ${price}`);
      }
    }

    if (!bestPrice) {
      throw new Error(`No price available for ${symbol}`);
    }

    return { price: bestPrice, exchange: bestExchange };
  } catch (error) {
    await log(`Error fetching price for ${crypto}/${fiat}: ${error.message}`);
    throw error;
  }
}

// Generate payment address for a cryptocurrency
async function generatePaymentAddress(crypto, orderId) {
  try {
    // For simplicity, use Binance as the primary exchange
    const exchange = exchanges.binance;
    if (!exchange.has['createDepositAddress']) {
      throw new Error('Exchange does not support deposit address creation');
    }

    const address = await exchange.createDepositAddress(crypto);
    await log(`Generated payment address for order ${orderId}: ${crypto} - ${address.address}`);

    return {
      address: address.address,
      tag: address.tag || null,
      orderId,
      crypto,
    };
  } catch (error) {
    await log(`Error generating payment address for ${crypto}: ${error.message}`);
    throw error;
  }
}

// Process payment (off-chain or on-chain)
async function processPayment(orderId, amount, crypto) {
  try {
    // Fetch price quote
    const { price, exchange } = await getPriceQuote(crypto);
    const cryptoAmount = amount / price;
    await log(`Calculated crypto amount for order ${orderId}: ${cryptoAmount} ${crypto}`);

    // Off-chain payment (via exchange deposit address)
    const paymentInfo = await generatePaymentAddress(crypto, orderId);

    // On-chain payment (if ERC-20 token, e.g., USDC)
    if (['USDC', 'ETH'].includes(crypto)) {
      const contractAddress = '0xYourDeployedPaymentProcessorAddress'; // Update after deployment
      const abi = require('../../artifacts/contracts/PaymentProcessor.sol/PaymentProcessor.json').abi;
      const contract = new web3.eth.Contract(abi, contractAddress);

      // Example: Call processPayment (requires user wallet interaction)
      await log(`Prepared on-chain payment for ${cryptoAmount} ${crypto} to contract ${contractAddress}`);
      // Note: Actual on-chain payment requires frontend interaction (Checkout.js)
    }

    return {
      status: 'SUCCESS',
      paymentInfo,
      cryptoAmount,
      exchange,
    };
  } catch (error) {
    await log(`Payment processing failed for order ${orderId}: ${error.message}`);
    return { status: 'FAILURE', error: error.message };
  }
}

// Convert payment to fiat/stablecoin
async function convertToFiat(orderId, cryptoAmount, crypto, fiat = 'USDC') {
  try {
    const exchange = exchanges.binance;
    const symbol = `${crypto}/${fiat}`;
    if (!exchange.has['createMarketSellOrder']) {
      throw new Error('Exchange does not support market sell orders');
    }

    const order = await exchange.createMarketSellOrder(symbol, cryptoAmount);
    await log(`Converted ${cryptoAmount} ${crypto} to ${fiat} for order ${orderId}: ${JSON.stringify(order)}`);

    return { status: 'SUCCESS', order };
  } catch (error) {
    await log(`Fiat conversion failed for order ${orderId}: ${error.message}`);
    return { status: 'FAILURE', error: error.message };
  }
}

// Main function to handle payment requests
async function main(orderId, amount, crypto) {
  try {
    const result = await processPayment(orderId, amount, crypto);
    if (result.status === 'SUCCESS') {
      // Optionally convert to stablecoin
      const conversion = await convertToFiat(orderId, result.cryptoAmount, crypto, 'USDC');
      console.log(JSON.stringify({ ...result, conversion }));
    } else {
      console.log(JSON.stringify(result));
    }
  } catch (error) {
    await log(`Main process failed: ${error.message}`);
    console.log(JSON.stringify({ status: 'FAILURE', error: error.message }));
  }
}

// Command-line interface for PHP integration
if (require.main === module) {
  const [,, orderId, amount, crypto] = process.argv;
  if (!orderId || !amount || !crypto) {
    console.error('Usage: node ccxt.js <orderId> <amount> <crypto>');
    process.exit(1);
  }
  main(orderId, parseFloat(amount), crypto);
}

module.exports = { getPriceQuote, generatePaymentAddress, processPayment, convertToFiat };
