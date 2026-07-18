// Person 2: Responsible for MetaMask connection and chain switching helpers.
async function connectMetaMask() {
  if (!window.ethereum) {
    console.warn('MetaMask is not installed.');
    return null;
  }

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return accounts[0] || null;
}

async function switchToSepolia() {
  if (!window.ethereum) {
    return false;
  }

  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0xaa36a7' }]
  });
  return true;
}

async function sendTransactionPlaceholder() {
  console.log('Transaction sending placeholder invoked.');
  return { success: true };
}

window.MetaMaskService = {
  connectMetaMask,
  switchToSepolia,
  sendTransactionPlaceholder
};