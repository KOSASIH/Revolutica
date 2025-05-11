require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

const COINBASE_API_KEY = process.env.COINBASE_API_KEY;
const QUANTUM_RNG_API_KEY = process.env.QUANTUM_RNG_API_KEY;

async function getQuantumRandomId() {
  // Placeholder for Quantinuum API
  const response = await fetch('https://api.quantinuum.com/rng', {
    headers: { Authorization: `Bearer ${QUANTUM_RNG_API_KEY}` },
  });
  const data = await response.json();
  return data.randomId || uuidv4(); // Fallback to UUID
}

async function createCharge(orderId, amount) {
  const charge = {
    name: `Order #${orderId}`,
    description: 'Crypto Payment',
    pricing_type: 'fixed_price',
    local_price: { amount: amount, currency: 'USD' },
    metadata: { order_id: orderId },
    transaction_id: await getQuantumRandomId(),
  };

  const response = await fetch('https://api.commerce.coinbase.com/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': COINBASE_API_KEY,
      'X-CC-Version': '2018-03-22',
    },
    body: JSON.stringify(charge),
  });

  const data = await response.json();
  if (data.error) {
    console.error('Coinbase error:', data.error);
    return 'FAILURE';
  }
  return 'SUCCESS';
}

const [orderId, amount] = process.argv.slice(2);
createCharge(orderId, amount).then(console.log);
