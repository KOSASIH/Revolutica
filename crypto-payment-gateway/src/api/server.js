require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { processPayment } = require('./ccxt.js');
const { processPiPayment } = require('./pi.js');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.API_PORT || 3000;
const API_KEY = process.env.API_KEY || 'your-secret-api-key';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/quantum-pay.log';

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ status: 'FAILURE', error: 'Unauthorized' });
  }
  next();
};

// Logging function
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - APIServer: ${message}\n`;
  await fs.appendFile(LOG_FILE_PATH, logMessage);
  console.log(logMessage);
}

// Process payment endpoint
app.post('/process-payment', authenticate, async (req, res) => {
  const { orderId, amount, crypto, chain = 'ethereum', userUid } = req.body;
  try {
    if (!orderId || !amount || !crypto) {
      throw new Error('Missing required parameters: orderId, amount, crypto');
    }
    await log(`Processing payment for order ${orderId}: ${amount} ${crypto}`);

    let result;
    if (crypto === 'PI') {
      result = await processPiPayment(orderId, amount, userUid);
    } else {
      result = await processPayment(orderId, amount, crypto, chain, userUid);
    }

    res.json(result);
  } catch (error) {
    await log(`Payment processing failed for order ${orderId}: ${error.message}`);
    res.status(500).json({ status: 'FAILURE', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
