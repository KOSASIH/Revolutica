require('@nomiclabs/hardhat-ethers');
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
      }
    }
  },
  networks: {
    mainnet: {
      url: process.env.ETH_NODE_URL || 'https://mainnet.infura.io/v3/your_project_id',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1
    },
    sepolia: {
      url: process.env.SEPOLIA_NODE_URL || 'https://sepolia.infura.io/v3/your_project_id',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    },
    bnbchain: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 56
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY // For contract verification
  }
};
