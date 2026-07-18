// Person 2: Responsible for Hardhat environment configuration.
require('dotenv').config({ path: '../.env' });

module.exports = {
  solidity: '0.8.24',
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_RPC_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};