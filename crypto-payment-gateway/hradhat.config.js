require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('dotenv').config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: 'istanbul' // Stable EVM version for compatibility
    }
  },
  networks: {
    mainnet: {
      url: process.env.ETH_NODE_URL || 'https://mainnet.infura.io/v3/your_project_id',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      gasPrice: 'auto'
    },
    sepolia: {
      url: process.env.ETH_NODE_URL || 'https://sepolia.infura.io/v3/your_project_id',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: 'auto'
    },
    bnbchain: {
      url: process.env.BNB_NODE_URL || 'https://bsc-dataseed.binance.org/',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 56,
      gasPrice: 'auto'
    },
    polygon: {
      url: process.env.POLYGON_NODE_URL || 'https://polygon-mainnet.infura.io/v3/your_project_id',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: 'auto'
    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY
    }
  },
  mocha: {
    timeout: 40000 // For unit tests
  }
};
