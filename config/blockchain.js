// Person 2: Responsible for blockchain provider and contract client configuration.
const { ethers } = require('ethers');

const rpcUrl = process.env.ALCHEMY_RPC_URL || '';
const provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;

const contractAddress = process.env.CONTRACT_ADDRESS || '';
const defaultPaymentGatewayAbi = [
  'event PaymentAccepted(bytes32 indexed invoiceHash,address indexed payer,address indexed token,uint256 amount,uint256 timestamp)',
  'function payNative(bytes32 invoiceHash) external payable',
  'function payToken(bytes32 invoiceHash,address token,uint256 amount) external',
  'function setAllowedToken(address token,bool allowed) external',
  'function setTreasury(address newTreasury) external',
  'function pause() external',
  'function unpause() external',
  'function treasury() external view returns (address)',
  'function paidInvoices(bytes32 invoiceHash) external view returns (bool)'
];
let contractAbi = defaultPaymentGatewayAbi;

try {
  contractAbi = process.env.CONTRACT_ABI ? JSON.parse(process.env.CONTRACT_ABI) : defaultPaymentGatewayAbi;
} catch (error) {
  contractAbi = defaultPaymentGatewayAbi;
}

const sepoliaChainId = Number(process.env.SEPOLIA_CHAIN_ID || 11155111);
const sepoliaChainIdHex = `0x${sepoliaChainId.toString(16)}`;

function isConfiguredContractAddress(address = contractAddress) {
  return ethers.isAddress(address) && address !== ethers.ZeroAddress;
}

module.exports = {
  provider,
  contractAddress,
  contractAbi,
  defaultPaymentGatewayAbi,
  sepoliaChainId,
  sepoliaChainIdHex,
  isConfiguredContractAddress
};
