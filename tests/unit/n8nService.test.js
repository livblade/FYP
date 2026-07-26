const { expect } = require('chai');
const axios = require('axios');
const n8nService = require('../../services/n8nService');

describe('n8nService local webhook integration', () => {
  const originalAxiosPost = axios.post;

  beforeEach(() => {
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_TEST_URL;
    delete process.env.N8N_API_KEY;
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    axios.post = originalAxiosPost;
  });

  it('posts settlement payloads to the local mock webhook in development', async () => {
    let seenUrl = null;
    let seenPayload = null;
    let seenConfig = null;

    axios.post = async (url, payload, config) => {
      seenUrl = url;
      seenPayload = payload;
      seenConfig = config;
      return { status: 200, data: { success: true } };
    };

    const result = await n8nService.triggerWorkflow({
      type: 'settlement',
      payload: { payment_id: 42, merchant_id: 7 }
    });

    expect(result.mode).to.equal('n8n-webhook');
    expect(seenUrl).to.equal('http://localhost:5678/webhook/settlement-reconciliation');
    expect(seenPayload.payment_id).to.equal(42);
    expect(seenConfig.headers['x-api-key']).to.equal('local-mock-key');
  });

  it('uses the test webhook url in development when configured', async () => {
    process.env.N8N_WEBHOOK_TEST_URL = 'https://example.test/webhook-test/settlement-reconciliation';

    let seenUrl = null;
    axios.post = async (url) => {
      seenUrl = url;
      return { status: 200, data: { success: true } };
    };

    await n8nService.triggerWorkflow({
      type: 'settlement',
      payload: { payment_id: 42, merchant_id: 7 }
    });

    expect(seenUrl).to.equal('https://example.test/webhook-test/settlement-reconciliation');
  });

  it('uses the production webhook url in production when configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.N8N_WEBHOOK_URL = 'https://example.prod/webhook/settlement-reconciliation';

    let seenUrl = null;
    axios.post = async (url) => {
      seenUrl = url;
      return { status: 200, data: { success: true } };
    };

    await n8nService.triggerWorkflow({
      type: 'settlement',
      payload: { payment_id: 42, merchant_id: 7 }
    });

    expect(seenUrl).to.equal('https://example.prod/webhook/settlement-reconciliation');
  });
});
