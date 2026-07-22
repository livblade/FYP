// Person 2: Responsible for MetaMask connection and chain switching helpers.
function assertMetaMaskAvailable() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed.');
  }
}

async function connectMetaMask() {
  assertMetaMaskAvailable();

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return accounts[0] || null;
}

async function getCurrentChainId() {
  assertMetaMaskAvailable();
  return window.ethereum.request({ method: 'eth_chainId' });
}

async function switchToSepolia(chainIdHex = '0xaa36a7') {
  assertMetaMaskAvailable();

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }]
    });
  } catch (error) {
    if (error.code !== 4902) {
      throw error;
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: chainIdHex,
          chainName: 'Ethereum Sepolia',
          nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
          blockExplorerUrls: ['https://sepolia.etherscan.io']
        }
      ]
    });
  }

  return true;
}

async function payNative({ contractAddress, abi, invoiceHash, amountEth }) {
  assertMetaMaskAvailable();

  if (!window.ethers) {
    throw new Error('ethers.js failed to load.');
  }
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('Payment gateway contract is not configured.');
  }
  if (!amountEth) {
    throw new Error('Invoice is missing a locked ETH amount.');
  }

  const browserProvider = new window.ethers.BrowserProvider(window.ethereum);
  const signer = await browserProvider.getSigner();
  const contract = new window.ethers.Contract(contractAddress, abi, signer);
  const value = window.ethers.parseEther(String(amountEth));
  const transaction = await contract.payNative(invoiceHash, { value });

  return {
    hash: transaction.hash,
    from: await signer.getAddress()
  };
}

window.MetaMaskService = {
  connectMetaMask,
  getCurrentChainId,
  switchToSepolia,
  payNative
};
