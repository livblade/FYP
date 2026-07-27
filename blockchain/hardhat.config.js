// Person 2: Responsible for Hardhat environment configuration.
require('dotenv').config({ path: '../.env' });
require('@nomicfoundation/hardhat-toolbox');

function getSepoliaAccounts() {
  const privateKey = (process.env.PRIVATE_KEY || '').trim();
  if (!privateKey || privateKey === 'replace_with_testnet_deployer_private_key') {
    return [];
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error('PRIVATE_KEY must be a 0x-prefixed 64-character hex testnet deployer key.');
  }

  return [privateKey];
}

module.exports = {
  solidity: '0.8.24',
  networks: {
    sepolia: {
      url:
        process.env.ALCHEMY_RPC_URL ||
        process.env.SEPOLIA_RPC_URL ||
        'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: getSepoliaAccounts()
    }
  }
};
