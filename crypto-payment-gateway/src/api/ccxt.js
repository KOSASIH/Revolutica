require('dotenv').config();
const ccxt = require('ccxt');
const Web3 = require('web3');
const fs = require('fs').promises;
const { generateTransactionId } = require('./quantum.js');
const { optimizeExchange, detectFraudAdvanced } = require('./ai.js');
const { encryptData } = require('../utils/encryption.js');
const { allocateFee } = require('../utils/balancer.js');
const { processPiPayment } = require('./pi.js');

// Load environment variables
const CCXT_API_KEY = process.env.CCXT_API_KEY;
const CCXT_API_SECRET = process.env.CCXT_API_SECRET;
const ETH_NODE_URL = process.env.ETH_NODE_URL;
const BNB_NODE_URL = process.env.BNB_NODE_URL;
const POLYGON_NODE_URL = process.env.POLYGON_NODE_URL;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/quantum-pay.log';

// Validate environment variables
const requiredEnv = [
  'CCXT_API_KEY',
  'CCXT_API_SECRET',
  'ETH_NODE_URL',
  'BNB_NODE_URL',
  'POLYGON_NODE_URL',
  'TREASURY_ADDRESS',
  'PRIVATE_KEY',
  'PI_API_KEY',
  'PI_WALLET_PRIVATE_SEED',
];
for (const env of requiredEnv) {
  if (!process.env[env]) {
    throw new Error(`Missing environment variable: ${env}`);
  }
}

// Initialize exchanges
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

// Initialize Web3 for multiple chains
const web3Providers = {
  ethereum: new Web3(ETH_NODE_URL),
  bnb: new Web3(BNB_NODE_URL),
  polygon: new Web3(POLYGON_NODE_URL),
};
const account = web3Providers.ethereum.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
Object.values(web3Providers).forEach(web3 => web3.eth.accounts.wallet.add(account));

// Logging function
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - CCXT: ${message}\n`;
  await fs.appendFile(LOG_FILE_PATH, logMessage);
  console.log(logMessage);
}

// Fetch price quote for a cryptocurrency
async function getPriceQuote(crypto, fiat = 'USD') {
  try {
    // Skip price quote for Pi Network (handled by pi.js)
    if (crypto === 'PI') {
      return { price: 1, exchange: 'pi_network' }; // Pi Coin price is managed by Pi Network
    }

    const symbol = `${crypto}/${fiat}`;
    const exchangesData = await Promise.all(
      Object.entries(exchanges).map(async ([name, exchange]) => {
        if (exchange.has['fetchTicker']) {
          try {
            const ticker = await exchange.fetchTicker(symbol);
            return {
              name,
              price: ticker.last,
              feeRate: ticker.fee || 0.001,
              liquidity: ticker.quoteVolume || 1000000,
              volatility: ticker.percentage || 0.05,
            };
          } catch (err) {
            await log(`Failed to fetch ticker from ${name} for ${symbol}: ${err.message}`);
            return null;
          }
        }
        return null;
      })
    ).then(results => results.filter(Boolean));

    if (!exchangesData.length) {
      throw new Error(`No price available for ${symbol}`);
    }

    // Use AI to select optimal exchange
    const { exchange: bestExchange } = await optimizeExchange(0, 1, crypto, exchangesData);
    const bestExchangeData = exchangesData.find(data => data.name === bestExchange);

    await log(`Fetched price from ${bestExchange}: ${crypto}/${fiat} = ${bestExchangeData.price}`);
    return { price: bestExchangeData.price, exchange: bestExchange };
  } catch (error) {
    await log(`Error fetching price for ${crypto}/${fiat}: ${error.message}`);
    throw error;
  }
}

// Generate payment address for a cryptocurrency
async function generatePaymentAddress(crypto, orderId, exchangeName = 'binance') {
  try {
    const exchange = exchanges[exchangeName];
    if (!exchange.has['createDepositAddress']) {
      throw new Error(`Exchange ${exchangeName} does not support deposit address creation`);
    }

    const address = await exchange.createDepositAddress(crypto);
    const encryptedAddress = await encryptData(address.address);
    await log(`Generated payment address for order ${orderId}: ${crypto} - ${address.address} (encrypted)`);

    return {
      address: address.address,
      encryptedAddress,
      tag: address.tag || null,
      orderId,
      crypto,
    };
  } catch (error) {
    await log(`Error generating payment address for ${crypto}: ${error.message}`);
    throw error;
  }
}

// Process payment (off-chain, on-chain, or Pi Network)
async function processPayment(orderId, amount, crypto, chain = 'ethereum', userUid = null) {
  try {
    // Validate inputs
    if (!orderId || !amount || !crypto) {
      throw new Error('Missing required parameters: orderId, amount, crypto');
    }
    if (crypto === 'PI' && !userUid) {
      throw new Error('Pi Network payments require a userUid');
    }

    // Generate quantum transaction ID
    const transactionId = await generateTransactionId(orderId);
    await log(`Generated quantum transaction ID for order ${orderId}: ${transactionId}`);

    // Perform advanced fraud detection
    const transactionData = {
      orderId,
      amount: parseFloat(amount),
      crypto,
      timestamp: Date.now(),
      walletAddress: crypto === 'PI' ? null : account.address,
    };
    const fraudResult = await detectFraudAdvanced(transactionData);
    if (fraudResult.isFraudulent) {
      throw new Error(`Fraud detected: Score ${fraudResult.fraudScore}`);
    }

    // Handle Pi Network payments
    if (crypto === 'PI') {
      const piResult = await processPiPayment(orderId, amount, userUid);
      if (piResult.status !== 'SUCCESS') {
        throw new Error(`Pi payment failed: ${piResult.error}`);
      }
      const encryptedAmount = await encryptData(piResult.amount);
      return {
        status: 'SUCCESS',
        transactionId,
        paymentInfo: {
          paymentId: piResult.paymentId,
          txid: piResult.txid,
          network: piResult.network,
        },
        cryptoAmount: piResult.amount,
        encryptedAmount,
        exchange: null,
        onChainTx: piResult.txid,
        feeAllocated: 0, // Pi payments handle fees differently
        treasuryTxHash: null,
      };
    }

    // Fetch price quote for other cryptocurrencies
    const { price, exchange } = await getPriceQuote(crypto);
    const cryptoAmount = amount / price;
    const encryptedAmount = await encryptData(cryptoAmount);
    await log(`Calculated crypto amount for order ${orderId}: ${cryptoAmount} ${crypto} (encrypted)`);

    // Off-chain payment
    const paymentInfo = await generatePaymentAddress(crypto, orderId, exchange);

    // On-chain payment for supported tokens
    let onChainTx = null;
    if (['USDC', 'ETH'].includes(crypto)) {
      const web3 = web3Providers[chain];
      const contractAddress = process.env[`${chain.toUpperCase()}_CONTRACT_ADDRESS`];
      if (!contractAddress) {
        throw new Error(`Contract address missing for ${chain}`);
      }

      const abi = require('../../artifacts/contracts/PaymentProcessor.sol/PaymentProcessor.json').abi;
      const contract = new web3.eth.Contract(abi, contractAddress);

      const tokenAddress = crypto === 'USDC' ? process.env[`${chain.toUpperCase()}_USDC_ADDRESS`] : null;
      const amountInWei = crypto === 'USDC' ? web3.utils.toWei(cryptoAmount.toString(), 'mwei') : web3.utils.toWei(cryptoAmount.toString(), 'ether');

      const data = contract.methods.processPayment(tokenAddress || TREASURY_ADDRESS, amountInWei).encodeABI();
      const tx = {
        from: account.address,
        to: contractAddress,
        data,
        gas: 200000,
        gasPrice: await web3.eth.getGasPrice(),
      };

      const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      onChainTx = receipt.transactionHash;
      await log(`Processed on-chain payment for ${cryptoAmount} ${crypto} on ${chain}: Tx ${onChainTx}`);
    }

    // Allocate fee to treasury
    const balancerResult = await allocateFee(orderId, amount, crypto);
    if (balancerResult.status !== 'SUCCESS') {
      throw new Error(`Fee allocation failed: ${balancerResult.error}`);
    }

    return {
      status: 'SUCCESS',
      transactionId,
      paymentInfo,
      cryptoAmount,
      encryptedAmount,
      exchange,
      onChainTx,
      feeAllocated: balancerResult.feeAmount,
      treasuryTxHash: balancerResult.txHash,
    };
  } catch (error) {
    await log(`Payment processing failed for order ${orderId}: ${error.message}`);
    return { status: 'FAILURE', error: error.message };
  }
}

// Convert payment to fiat/stablecoin
async function convertToFiat(orderId, cryptoAmount, crypto, fiat = 'USDC', exchangeName = 'binance') {
  try {
    if (crypto === 'PI') {
      await log(`Fiat conversion skipped for Pi Network for order ${orderId}`);
      return { status: 'SUCCESS', order: null, encryptedOrderId: null };
    }

    const exchange = exchanges[exchangeName];
    const symbol = `${crypto}/${fiat}`;
    if (!exchange.has['createMarketSellOrder']) {
      throw new Error(`Exchange ${exchangeName} does not support market sell orders`);
    }

    const order = await exchange.createMarketSellOrder(symbol, cryptoAmount);
    const encryptedOrderId = await encryptData(order.id);
    await log(`Converted ${cryptoAmount} ${crypto} to ${fiat} for order ${orderId}: Order ${order.id} (encrypted)`);

    return { status: 'SUCCESS', order, encryptedOrderId };
  } catch (error) {
    await log(`Fiat conversion failed for order ${orderId}: ${error.message}`);
    return { status: 'FAILURE', error: error.message };
  }
}

// Main function to handle payment requests
async function main(orderId, amount, crypto, chain = 'ethereum', userUid = null) {
  try {
    const result = await processPayment(orderId, amount, crypto, chain, userUid);
    if (result.status === 'SUCCESS' && crypto !== 'PI') {
      const conversion = await convertToFiat(orderId, result.cryptoAmount, crypto, 'USDC', result.exchange);
      return { ...result, conversion };
    }
    return result;
  } catch (error) {
    await log(`Main process failed: ${error.message}`);
    return { status: 'FAILURE', error: error.message };
  }
}

// Command-line interface for PHP integration
if (require.main === module) {
  const [,, orderId, amount, crypto, chain = 'ethereum', userUid] = process.argv;
  if (!orderId || !amount || !crypto || (crypto === 'PI' && !userUid)) {
    console.error('Usage: node ccxt.js <orderId> <amount> <crypto> [chain] [userUid]');
    process.exit(1);
  }
  main(orderId, parseFloat(amount), crypto, chain, userUid).then(result => {
    console.log(JSON.stringify(result));
  });
}

module.exports = { getPriceQuote, generatePaymentAddress, processPayment, convertToFiat, main };
