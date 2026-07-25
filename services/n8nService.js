// Person 4: Responsible for n8n workflow trigger helpers.
const axios = require('axios');
const settlementService = require('./settlementService');

async function triggerWorkflow({ type, payload }) {
  const baseUrl = process.env.N8N_BASE_URL || '';
  const webhookPath = process.env.N8N_SETTLEMENT_WEBHOOK_PATH || '';
  const webhookUrl = process.env.N8N_WEBHOOK_URL || (baseUrl && webhookPath ? `${baseUrl.replace(/\/$/, '')}/${webhookPath.replace(/^\//, '')}` : '');

  if (!webhookUrl) {
    if (type === 'settlement' && payload?.payment_id) {
      const settlement = await settlementService.createSettlementForPayment({
        paymentId: Number(payload.payment_id),
        merchantId: payload.merchant_id || null,
        payoutAddress: payload.payout_address || null,
        providerReference: payload.provider_reference || 'LOCAL-FALLBACK'
      });

      return {
        success: true,
        mode: 'local-fallback',
        message: 'n8n webhook not configured. Settlement created locally.',
        data: settlement
      };
    }

    return {
      success: true,
      mode: 'local-fallback',
      message: 'n8n webhook not configured. No external workflow triggered.'
    };
  }

  const response = await axios.post(webhookUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.N8N_API_KEY || ''
    },
    timeout: 10000
  });

  return {
    success: true,
    mode: 'n8n-webhook',
    status: response.status,
    data: response.data
  };
}

module.exports = {
  triggerWorkflow
};