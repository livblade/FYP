// Person 4: Responsible for n8n workflow trigger helpers.
const axios = require('axios');
const settlementService = require('./settlementService');

const DEFAULT_LOCAL_WEBHOOK_URL = 'http://localhost:5678/webhook/settlement-reconciliation';

function buildWebhookUrl() {
  const configured = process.env.N8N_WEBHOOK_URL || '';
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    return '';
  }

  return DEFAULT_LOCAL_WEBHOOK_URL;
}

async function triggerWorkflow({ type, payload }) {
  const baseUrl = process.env.N8N_BASE_URL || '';
  const webhookPath = process.env.N8N_SETTLEMENT_WEBHOOK_PATH || '';
  const explicitUrl = process.env.N8N_WEBHOOK_URL || '';
  const webhookUrl = explicitUrl || (baseUrl && webhookPath ? `${baseUrl.replace(/\/$/, '')}/${webhookPath.replace(/^\//, '')}` : buildWebhookUrl());

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
      'x-api-key': process.env.N8N_API_KEY || 'local-mock-key'
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