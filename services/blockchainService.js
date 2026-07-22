// Person 2: Responsible for blockchain read/write helper service methods.
const { ethers } = require('ethers');
const {
  provider,
  contractAddress,
  contractAbi,
  sepoliaChainId,
  sepoliaChainIdHex,
  isConfiguredContractAddress
} = require('../config/blockchain');

function computeInvoiceHash(publicId) {
  if (!publicId) {
    throw new Error('Invoice public ID is required');
  }

  return ethers.id(String(publicId));
}

function getPaymentGatewayInterface() {
  return new ethers.Interface(contractAbi);
}

function getCheckoutConfig(invoice) {
  return {
    contractAddress,
    contractAbi,
    chainId: sepoliaChainId,
    chainIdHex: sepoliaChainIdHex,
    invoiceHash: invoice.contract_invoice_hash || computeInvoiceHash(invoice.public_id),
    explorerBaseUrl: process.env.SEPOLIA_EXPLORER_BASE_URL || 'https://sepolia.etherscan.io',
    isContractConfigured: isConfiguredContractAddress(contractAddress)
  };
}

async function getTransactionReceipt(transactionHash) {
  if (!provider) {
    return null;
  }

  return provider.getTransactionReceipt(transactionHash);
}

function buildExplorerTransactionUrl(transactionHash) {
  const baseUrl = process.env.SEPOLIA_EXPLORER_BASE_URL || 'https://sepolia.etherscan.io';
  return `${baseUrl.replace(/\/$/, '')}/tx/${transactionHash}`;
}

module.exports = {
  computeInvoiceHash,
  getPaymentGatewayInterface,
  getCheckoutConfig,
  getTransactionReceipt,
  buildExplorerTransactionUrl
};
