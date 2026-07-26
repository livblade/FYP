// Person 2: Responsible for blockchain provider and contract client configuration.
const { ethers } = require('ethers');

const rpcUrl = process.env.ALCHEMY_RPC_URL || process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;

const contractAddress = process.env.CONTRACT_ADDRESS || '';
const defaultPaymentGatewayAbi = [
  'event PaymentAccepted(bytes32 indexed invoiceHash,address indexed payer,address indexed token,uint256 amount,uint256 timestamp)',
  'event TreasuryUpdated(address indexed oldTreasury,address indexed newTreasury)',
  'event TokenAllowanceUpdated(address indexed token,bool allowed)',
  'function payNative(bytes32 invoiceHash) external payable',
  'function payToken(bytes32 invoiceHash,address token,uint256 amount) external',
  'function setAllowedToken(address token,bool allowed) external',
  'function setTreasury(address newTreasury) external',
  'function pause() external',
  'function unpause() external',
  'function treasury() external view returns (address)',
  'function allowedTokens(address token) external view returns (bool)',
  'function paidInvoices(bytes32 invoiceHash) external view returns (bool)'
];

function parseContractAbi(abiValue = process.env.CONTRACT_ABI) {
  if (!abiValue) {
    return {
      abi: defaultPaymentGatewayAbi,
      source: 'fallback',
      warning: 'CONTRACT_ABI is not set; using minimal PaymentGateway fallback ABI.'
    };
  }

  try {
    const parsedAbi = typeof abiValue === 'string' ? JSON.parse(abiValue) : abiValue;
    if (Array.isArray(parsedAbi) && parsedAbi.length > 0) {
      return {
        abi: parsedAbi,
        source: 'env',
        warning: null
      };
    }

    return {
      abi: defaultPaymentGatewayAbi,
      source: 'fallback',
      warning: 'CONTRACT_ABI is empty or not an array; using minimal PaymentGateway fallback ABI.'
    };
  } catch (error) {
    return {
      abi: defaultPaymentGatewayAbi,
      source: 'fallback',
      warning: `CONTRACT_ABI could not be parsed as JSON; using minimal PaymentGateway fallback ABI. ${error.message}`
    };
  }
}

const parsedContractAbi = parseContractAbi();
const contractAbi = parsedContractAbi.abi;
const contractAbiSource = parsedContractAbi.source;
const contractAbiWarning = parsedContractAbi.warning;

const sepoliaChainId = Number(process.env.SEPOLIA_CHAIN_ID || 11155111);
const sepoliaChainIdHex = `0x${sepoliaChainId.toString(16)}`;

function isConfiguredContractAddress(address = contractAddress) {
  return ethers.isAddress(address) && address !== ethers.ZeroAddress;
}

if (
  process.env.NODE_ENV === 'production' &&
  isConfiguredContractAddress(contractAddress) &&
  contractAbiSource !== 'env'
) {
  throw new Error('CONTRACT_ABI must be set to the real deployed PaymentGateway ABI in production.');
}

module.exports = {
  provider,
  contractAddress,
  contractAbi,
  contractAbiSource,
  contractAbiWarning,
  defaultPaymentGatewayAbi,
  parseContractAbi,
  sepoliaChainId,
  sepoliaChainIdHex,
  isConfiguredContractAddress
};
