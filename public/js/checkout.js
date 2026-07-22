// Person 3: Responsible for checkout interaction flow and UI status polling.
document.addEventListener('DOMContentLoaded', () => {
  const checkoutCard = document.getElementById('checkoutCard');
  const connectButton = document.getElementById('connectWalletBtn');
  const payButton = document.getElementById('payNowBtn');
  const statusElement = document.getElementById('checkoutStatus');
  const countdownElement = document.getElementById('checkoutCountdown');
  const transactionHashBox = document.getElementById('transactionHashBox');
  const transactionHashLink = document.getElementById('transactionHashLink');
  const abiElement = document.getElementById('paymentGatewayAbi');

  const invoicePublicId = checkoutCard ? checkoutCard.dataset.invoicePublicId : null;
  const contractAddress = checkoutCard ? checkoutCard.dataset.contractAddress : null;
  const invoiceHash = checkoutCard ? checkoutCard.dataset.invoiceHash : null;
  const requiredCryptoAmount = checkoutCard ? checkoutCard.dataset.requiredCryptoAmount : null;
  const chainId = checkoutCard ? Number(checkoutCard.dataset.chainId) : 11155111;
  const chainIdHex = checkoutCard ? checkoutCard.dataset.chainIdHex : '0xaa36a7';
  const explorerBaseUrl = checkoutCard ? checkoutCard.dataset.explorerBaseUrl : 'https://sepolia.etherscan.io';
  const isContractConfigured = checkoutCard ? checkoutCard.dataset.contractConfigured === 'true' : false;
  const contractAbi = abiElement ? JSON.parse(abiElement.textContent || '[]') : [];
  let walletAddress = null;
  let submittedTransactionHash = null;

  const stepElements = Array.from(document.querySelectorAll('#checkoutSteps [data-step]'));
  const markStep = (stepKey) => {
    let activeReached = false;
    stepElements.forEach((item) => {
      if (item.dataset.step === stepKey) {
        item.classList.add('active');
        activeReached = true;
        return;
      }
      if (!activeReached) {
        item.classList.add('active');
      }
    });
  };

  const setStatus = (message, type = 'secondary') => {
    if (!statusElement) {
      return;
    }
    statusElement.className = `alert alert-${type} mt-3 mb-0`;
    statusElement.textContent = message;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const setBusy = (busy) => {
    if (payButton) {
      payButton.disabled = busy || !isContractConfigured || !requiredCryptoAmount || Boolean(submittedTransactionHash);
    }
    if (connectButton) {
      connectButton.disabled = busy;
    }
  };

  const showTransactionHash = (hash) => {
    if (!transactionHashBox || !transactionHashLink) {
      return;
    }

    const baseUrl = explorerBaseUrl.replace(/\/$/, '');
    transactionHashLink.href = `${baseUrl}/tx/${hash}`;
    transactionHashLink.textContent = hash;
    transactionHashBox.classList.remove('d-none');
  };

  const pollStatus = async () => {
    const terminalFailureStatuses = ['FAILED', 'REJECTED', 'UNDERPAID', 'OVERPAID', 'DUPLICATE'];

    for (let attempt = 0; attempt < 24; attempt += 1) {
      await sleep(attempt === 0 ? 1500 : 5000);

      const statusResponse = await fetch(`/api/payments/status/${invoicePublicId}`);
      const statusPayload = await statusResponse.json();

      if (!statusPayload.success) {
        throw new Error(statusPayload.message || 'Unable to retrieve payment status');
      }

      const paymentStatus = statusPayload.data.payment_status;
      const invoiceStatus = statusPayload.data.invoice_status;

      if (paymentStatus === 'CONFIRMED' || invoiceStatus === 'PAID') {
        markStep('complete');
        setStatus('Payment confirmed on-chain.', 'success');
        return true;
      }

      if (terminalFailureStatuses.includes(paymentStatus) || invoiceStatus === 'FAILED') {
        setStatus(`Payment status: ${paymentStatus}`, 'danger');
        return false;
      }

      markStep('verify');
      setStatus(`Payment status: ${paymentStatus}. Waiting for independent verification...`, 'info');
    }

    setStatus('Transaction submitted. Verification is still pending; keep this hash for tracking.', 'warning');
    return null;
  };

  if (countdownElement) {
    const expiry = new Date(countdownElement.dataset.expiry).getTime();
    const tick = () => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        countdownElement.textContent = 'EXPIRED';
        countdownElement.classList.add('text-danger');
        setStatus('Invoice has expired.', 'danger');
        if (payButton) {
          payButton.disabled = true;
        }
        return;
      }
      const minutes = Math.floor((remaining / 1000 / 60) % 60);
      const seconds = Math.floor((remaining / 1000) % 60);
      countdownElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      if (minutes < 2) {
        countdownElement.classList.add('text-danger');
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      try {
        setStatus('Connecting wallet...', 'info');
        const account = await window.MetaMaskService?.connectMetaMask();
        walletAddress = account;
        if (account) {
          markStep('connect');
          setStatus(`Wallet connected: ${account.slice(0, 8)}...`, 'success');
        } else {
          setStatus('No wallet account selected.', 'warning');
        }
      } catch (error) {
        setStatus(error.message || 'Unable to connect wallet. Please retry.', 'danger');
      }
    });
  }

  if (payButton) {
    payButton.addEventListener('click', async () => {
      if (!invoicePublicId) {
        setStatus('Invoice context missing.', 'danger');
        return;
      }
      if (!isContractConfigured) {
        setStatus('Payment gateway contract is not configured.', 'danger');
        return;
      }
      if (!requiredCryptoAmount) {
        setStatus('Invoice is missing a locked ETH amount.', 'danger');
        return;
      }

      setBusy(true);

      try {
        if (!walletAddress) {
          walletAddress = await window.MetaMaskService?.connectMetaMask();
          markStep('connect');
        }

        setStatus('Switching to Sepolia network...', 'info');
        await window.MetaMaskService?.switchToSepolia(chainIdHex);
        markStep('network');

        setStatus('Confirm the MetaMask transaction to pay this invoice.', 'info');
        const transaction = await window.MetaMaskService?.payNative({
          contractAddress,
          abi: contractAbi,
          invoiceHash,
          amountEth: requiredCryptoAmount
        });

        submittedTransactionHash = transaction.hash;
        showTransactionHash(submittedTransactionHash);
        markStep('submitted');
        setStatus('Transaction submitted. Saving hash for verification...', 'success');

        const response = await fetch('/api/payments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoice_public_id: invoicePublicId,
            transaction_hash: submittedTransactionHash,
            wallet_address: transaction.from || walletAddress,
            chain_id: chainId,
            crypto_amount: requiredCryptoAmount
          })
        });

        const payload = await response.json();
        if (!payload.success) {
          throw new Error(payload.message || 'Failed to submit transaction hash');
        }

        markStep('verify');
        const confirmed = await pollStatus();

        if (confirmed === true) {
          await sleep(1000);
          window.location.href = `/payments/checkout/${invoicePublicId}/success?tx=${submittedTransactionHash}`;
        } else if (confirmed === false) {
          await sleep(1000);
          window.location.href = `/payments/checkout/${invoicePublicId}/failed?tx=${submittedTransactionHash}`;
        }
      } catch (error) {
        setStatus(error.message || 'Payment failed. Please retry.', 'danger');
      } finally {
        setBusy(false);
      }
    });
  }

  if (!isContractConfigured) {
    setStatus('Deploy PaymentGateway and set CONTRACT_ADDRESS before using MetaMask checkout.', 'warning');
  } else if (!requiredCryptoAmount) {
    setStatus('Invoice is awaiting a locked ETH quote.', 'warning');
  }
});
