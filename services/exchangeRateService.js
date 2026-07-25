// Person 2: Responsible for exchange rate provider integrations.
const axios = require('axios');

const DEFAULT_BUFFER_PERCENTAGE = Number(process.env.QUOTE_BUFFER_PERCENTAGE || 2);
const DEFAULT_FALLBACK_SGD_PER_ETH = Number(process.env.FALLBACK_SGD_PER_ETH || 5000);

function roundDecimal(value, decimals = 18) {
  return Number(value).toFixed(decimals);
}

async function fetchSgdPerEth() {
  const baseUrl = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
  const endpoint = `${baseUrl.replace(/\/$/, '')}/simple/price`;
  const response = await axios.get(endpoint, {
    params: {
      ids: 'ethereum',
      vs_currencies: 'sgd'
    },
    timeout: 8000
  });

  const sgdPerEth = Number(response?.data?.ethereum?.sgd);
  if (!Number.isFinite(sgdPerEth) || sgdPerEth <= 0) {
    throw new Error('Invalid exchange rate from provider');
  }

  return {
    sgdPerEth,
    rawResponse: response.data,
    source: 'COINGECKO'
  };
}

async function getQuote({ amountSgd, bufferPercentage = DEFAULT_BUFFER_PERCENTAGE } = {}) {
  const normalizedAmountSgd = Number(amountSgd);
  if (!Number.isFinite(normalizedAmountSgd) || normalizedAmountSgd <= 0) {
    return { success: false, message: 'amountSgd must be a positive number' };
  }

  const normalizedBuffer = Number.isFinite(Number(bufferPercentage)) ? Number(bufferPercentage) : DEFAULT_BUFFER_PERCENTAGE;
  const multiplier = 1 + normalizedBuffer / 100;

  try {
    const { sgdPerEth, rawResponse, source } = await fetchSgdPerEth();
    const rawEthAmount = normalizedAmountSgd / sgdPerEth;
    const bufferedEthAmount = rawEthAmount * multiplier;

    return {
      success: true,
      source,
      exchangeRate: roundDecimal(sgdPerEth, 6),
      cryptoAmount: roundDecimal(bufferedEthAmount, 18),
      bufferPercentage: roundDecimal(normalizedBuffer, 2),
      rawResponse,
      message: 'Quote fetched successfully'
    };
  } catch (error) {
    const fallbackEthAmount = (normalizedAmountSgd / DEFAULT_FALLBACK_SGD_PER_ETH) * multiplier;
    return {
      success: true,
      source: 'FALLBACK',
      exchangeRate: roundDecimal(DEFAULT_FALLBACK_SGD_PER_ETH, 6),
      cryptoAmount: roundDecimal(fallbackEthAmount, 18),
      bufferPercentage: roundDecimal(normalizedBuffer, 2),
      rawResponse: null,
      warning: `Live quote unavailable, fallback rate used (${DEFAULT_FALLBACK_SGD_PER_ETH} SGD/ETH)`,
      message: error.message
    };
  }
}

module.exports = {
  getQuote
};