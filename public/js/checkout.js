// Person 3: Responsible for checkout interaction flow and UI status polling.
document.addEventListener('DOMContentLoaded', () => {
  const checkoutCard = document.getElementById('checkoutCard');
  const connectButton = document.getElementById('connectWalletBtn');
  const payButton = document.getElementById('payNowBtn');
  const statusElement = document.getElementById('checkoutStatus');
  const countdownElement = document.getElementById('checkoutCountdown');

  const invoicePublicId = checkoutCard ? checkoutCard.dataset.invoicePublicId : null;
  let walletAddress = null;

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

  if (countdownElement) {
    const expiry = new Date(countdownElement.dataset.expiry).getTime();
    const tick = () => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        countdownElement.textContent = 'EXPIRED';
        countdownElement.classList.add('text-danger');
        setStatus('Invoice has expired.', 'danger');
        payButton.disabled = true;
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
          setStatus('MetaMask not available. Using mock wallet mode.', 'warning');
        }
      } catch (error) {
        setStatus('Unable to connect wallet. Please retry.', 'danger');
      }
    });
  }

  if (payButton) {
    payButton.addEventListener('click', async () => {
      if (!invoicePublicId) {
        setStatus('Invoice context missing.', 'danger');
        return;
      }

      payButton.disabled = true;
      connectButton.disabled = true;

      try {
        setStatus('Switching to Sepolia network...', 'info');
        await window.MetaMaskService?.switchToSepolia();

        setStatus('Preparing transaction intent...', 'info');
        markStep('intent');
        await sleep(2000);

        const response = await fetch('/payments/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoicePublicId,
            payer_wallet: walletAddress || '0x0000000000000000000000000000000000000000',
            crypto_amount: '0.000000000000000000'
          })
        });

        const payload = await response.json();
        if (!payload.success) {
          throw new Error(payload.message || 'Failed to create payment intent');
        }

        markStep('submitted');
        setStatus('Transaction submitted. Verifying payment status...', 'success');

        markStep('verify');
        await sleep(2500);
        const statusResponse = await fetch(`/payments/status/${invoicePublicId}`);
        const statusPayload = await statusResponse.json();

        if (statusPayload.success) {
          if (statusPayload.data.payment_status === 'DETECTED' || statusPayload.data.payment_status === 'CONFIRMED') {
            markStep('complete');
            setStatus(`Payment status: ${statusPayload.data.payment_status}`, 'success');
            await sleep(1000);
            window.location.href = `/payments/checkout/${invoicePublicId}/success`;
          } else {
            setStatus(`Payment status: ${statusPayload.data.payment_status}`, 'warning');
          }
        }
      } catch (error) {
        setStatus(error.message || 'Payment failed. Please retry.', 'danger');
        window.location.href = `/payments/checkout/${invoicePublicId}/failed`;
      } finally {
        payButton.disabled = false;
        connectButton.disabled = false;
      }
    });
  }
});