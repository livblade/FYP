// Person 2: Responsible for MetaMask connection and chain switching helpers.
function getMetaMaskProvider() {
  if (!window.ethereum) {
    return null;
  }

  // When multiple wallet extensions are installed, select MetaMask explicitly.
  if (Array.isArray(window.ethereum.providers)) {
    const metaMaskProvider = window.ethereum.providers.find(
      (provider) => provider && provider.isMetaMask && !provider.isCoinbaseWallet
    );
    if (metaMaskProvider) {
      return metaMaskProvider;
    }
  }

  return window.ethereum.isMetaMask ? window.ethereum : null;
}

function assertMetaMaskAvailable() {
  if (!getMetaMaskProvider()) {
    throw new Error('MetaMask is not installed.');
  }
}

async function connectMetaMask() {
  assertMetaMaskAvailable();
  const provider = getMetaMaskProvider();

  // Ask for account permission so MetaMask can present account selection if needed.
  await provider.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] }).catch(() => null);
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  return accounts[0] || null;
}

async function getCurrentChainId() {
  assertMetaMaskAvailable();
  const provider = getMetaMaskProvider();
  return provider.request({ method: 'eth_chainId' });
}

async function switchToSepolia(chainIdHex = '0xaa36a7') {
  assertMetaMaskAvailable();
  const provider = getMetaMaskProvider();

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }]
    });
  } catch (error) {
    if (error.code !== 4902) {
      throw error;
    }

    await provider.request({
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
  const provider = getMetaMaskProvider();

  if (!window.ethers) {
    throw new Error('ethers.js failed to load.');
  }
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('Payment gateway contract is not configured.');
  }
  if (!amountEth) {
    throw new Error('Invoice is missing a locked ETH amount.');
  }

  const browserProvider = new window.ethers.BrowserProvider(provider);
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
