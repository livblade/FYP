// Person 2: Responsible for blockchain provider and contract client configuration.
const { ethers } = require('ethers');

const rpcUrl = process.env.ALCHEMY_RPC_URL || '';
const provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;

const contractAddress = process.env.CONTRACT_ADDRESS || '';
let contractAbi = [];

try {
  contractAbi = process.env.CONTRACT_ABI ? JSON.parse(process.env.CONTRACT_ABI) : [];
} catch (error) {
  contractAbi = [];
}

module.exports = {
  provider,
  contractAddress,
  contractAbi
};