require('dotenv').config();

const axios = require('axios');

async function testWebhook() {
  console.log('Testing Webhook Endpoint');
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  console.log('\nTest 1: Get payment status');
  try {
    const statusResponse = await axios.get(`${baseUrl}/api/invoices/INV-TEST-123/status`);
    console.log('Status response:', JSON.stringify(statusResponse.data, null, 2));
  } catch (error) {
    console.error('Status test failed:', error.response?.data || error.message);
  }

  console.log('\nTest 2: Send mock webhook');
  const mockTxHash = `0x${Buffer.from('test_transaction_hash', 'utf8').toString('hex').padEnd(64, '0').slice(0, 64)}`;
  const mockPayload = {
    webhookId: 'wh_test',
    event: {
      id: 'evt_test',
      type: 'TRANSACTION',
      data: {
        transaction: {
          hash: mockTxHash,
          from: '0x1234567890123456789012345678901234567890',
          to: process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
          value: '0x2386f26fc10000',
          gasPrice: '0x3b9aca00',
          gas: '0x5208',
          input: '0x3a6b79b00000000000000000000000000000000000000000000000000000000000000001'
        }
      }
    }
  };

  try {
    const response = await axios.post(`${baseUrl}/webhooks/alchemy`, mockPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Webhook response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Webhook test failed:', error.response?.data || error.message);
  }

  console.log('\nTest 3: Test verification endpoint');
  try {
    const verifyResponse = await axios.post(
      `${baseUrl}/internal/payments/verify`,
      {
        transaction_hash: mockTxHash,
        invoice_public_id: 'INV-TEST-123'
      },
      {
        headers: {
          'x-api-key': process.env.INTERNAL_API_KEY || 'test-key'
        }
      }
    );
    console.log('Verification response:', JSON.stringify(verifyResponse.data, null, 2));
  } catch (error) {
    console.error('Verification test failed:', error.response?.data || error.message);
  }
}

testWebhook();
