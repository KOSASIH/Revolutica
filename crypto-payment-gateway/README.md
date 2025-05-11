# QuantumPay Gateway

A high-tech WooCommerce plugin for accepting 300+ cryptocurrencies with quantum RNG, AI optimization, homomorphic encryption, multi-chain support, and Pi Network integration.

## Features
- **Multi-Chain Payments**: Supports Ethereum, BNB Chain, Polygon, and Pi Network for cryptocurrencies like BTC, ETH, USDC, and PI.
- **Quantum RNG**: Generates secure transaction IDs using quantum-inspired randomness.
- **AI Optimization**: Selects optimal exchanges and detects fraud using TensorFlow.js.
- **Homomorphic Encryption**: Secures transaction data with Microsoft SEAL.
- **Economic Balancing**: Allocates fees to a treasury wallet for ecosystem stability.
- **Node.js API Server**: Replaces shell_exec for improved performance and security.
- **Unified Logging**: Tracks operations in logs/quantum-pay.log.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- WordPress with WooCommerce
- Hardhat for smart contract deployment
- API keys for CCXT, Coinbase Commerce, Pi Network, and Quantinuum

## Installation

1. Clone the Repository:

   ```bash
   1 git clone https://github.com/KOSASIH/Revolutica.git
   2 cd Revolutica/crypto-payment-gateway
   ```
2. Install Dependencies:
   ```bash
   1 npm install
   2 cd src/frontend/react && npm install
   ```
3. Configure Environment:
   Create a .env file in the root directory with the following:
   ```env
   1 COINBASE_API_KEY=your_coinbase_commerce_api_key
   2 CCXT_API_KEY=your_ccxt_api_key
   3 CCXT_API_SECRET=your_ccxt_api_secret
   4 ETH_NODE_URL=https://sepolia.infura.io/v3/your_project_id
   5 BNB_NODE_URL=https://bsc-testnet.binance.org/
   6 POLYGON_NODE_URL=https://rpc-amoy.polygon.technology/
   7 PRIVATE_KEY=your_metamask_private_key
   8 TREASURY_ADDRESS=0xYourTreasuryAddress
   9 PI_API_KEY=your_pi_developer_portal_api_key
   10 PI_WALLET_PRIVATE_SEED=S_your_wallet_private_seed
   11 PI_NETWORK=Pi Testnet
   12 API_PORT=3000
   13 API_KEY=your-secret-api-key
   14 QUANTUM_RNG_API_KEY=your_quantinuum_api_key
   15 AI_SERVICE_API_KEY=your_tensorflow_api_key
   16 LOG_FILE_PATH=./logs/quantum-pay.log
   ```
4. Deploy Smart Contracts:
   ```bash
   1 npm run compile
   2 npm run deploy:ethereum
   3 npm run deploy:bnb
   4 npm run deploy:polygon
   ```
   Update .env with contract addresses.
5. Start the API Server:
   ```bash
   1 npm run start:server
   ```
6. Install Plugin in WooCommerce:
   - Copy the project directory to wp-content/plugins/.
   - Activate the QuantumPay Gateway plugin in WordPress.
   - Configure the plugin in WooCommerce settings with your preferred cryptocurrencies.
## Usage
1. Test Payments:
  ```bash
  1 npm run start:ccxt 123 100 BTC
  2 npm run start:pi 123 1 user_uid_123
  ```
2. API Endpoint:
  ```bash
  1 curl -X POST http://localhost:3000/process-payment \
  2   -H "Authorization: Bearer your-secret-api-key" \
  3   -H "Content-Type: application/json" \
  4   -d '{"orderId":"123","amount":100,"crypto":"BTC","chain":"ethereum"}'
  ```
3. Check Logs:
  ```bash
  cat logs/quantum-pay.log
  ```
## Testing
1. Run Hardhat tests for smart contracts:
  ```bash
  1 npm run test
  ```
Run API tests:
  ```bash
  2 npm run test:api
  ```
## Security
- Exclude .env and logs/quantum-pay.log from Git (chmod 600 .env).
- Use HTTPS for the API server in production.
- Store sensitive keys in AWS Secrets Manager.
- Run npm audit and npm run lint before deployment.
## Contributing
Submit issues or pull requests at https://github.com/KOSASIH/Revolutica/issues.
## License
MIT License © KOSASIH
