// Person 3: Webhook handling controller.
const crypto = require('crypto');
const axios = require('axios');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const definePayment = require('../models/Payment');
const defineWebhookEvent = require('../models/WebhookEvent');
const defineInvoice = require('../models/Invoice');
const defineMerchant = require('../models/Merchant');
const PaymentVerificationService = require('../services/paymentVerificationService');
const { PAYMENT_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

const Payment = definePayment(sequelize, DataTypes);
const WebhookEvent = defineWebhookEvent(sequelize, DataTypes);
const Invoice = defineInvoice(sequelize, DataTypes);
const Merchant = defineMerchant(sequelize, DataTypes);

class WebhookController {
  async handleAlchemyWebhook(req, res) {
    try {
      const isValid = this.verifyWebhookSignature(req);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      }

      const webhookEvent = await this.storeWebhookEvent(req.body);
      if (webhookEvent.processing_status === 'DUPLICATE') {
        return res.status(200).json({ success: true, message: 'Duplicate webhook ignored' });
      }

      setImmediate(async () => {
        try {
          await this.processWebhookEvent(req.body, webhookEvent);
        } catch (error) {
          logger.error('Webhook background processing failed', { error: error.message });
          await webhookEvent.update({
            processing_status: 'FAILED',
            failure_reason: error.message,
            processed_at: new Date()
          });
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Webhook received and queued for processing',
        webhook_event_id: webhookEvent.webhook_event_id
      });
    } catch (error) {
      logger.error('Webhook handling error', { error: error.message });
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  verifyWebhookSignature(req) {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    const signature = req.headers['x-alchemy-signature'];
    const secret = process.env.ALCHEMY_WEBHOOK_SECRET;
    if (!signature || !secret) {
      return false;
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  async storeWebhookEvent(payload) {
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const existing = await WebhookEvent.findOne({ where: { payload_hash: payloadHash } });

    if (existing) {
      await existing.update({ processing_status: 'DUPLICATE' });
      return existing;
    }

    return WebhookEvent.create({
      provider: 'ALCHEMY',
      external_event_id: payload?.event?.id || null,
      payload_hash: payloadHash,
      raw_payload: payload,
      processing_status: 'PENDING',
      received_at: new Date()
    });
  }

  async processWebhookEvent(payload, webhookEvent) {
    await webhookEvent.update({ processing_status: 'PROCESSING' });

    const transaction = payload?.event?.data?.transaction;
    if (!transaction || !transaction.hash) {
      throw new Error('Invalid webhook payload - missing transaction data');
    }

    if (!this.isOurContract(transaction.to)) {
      await webhookEvent.update({ processing_status: 'COMPLETED', processed_at: new Date() });
      return;
    }

    const invoiceHash = this.decodeInvoiceHashFromTransaction(transaction.input);
    if (!invoiceHash) {
      await webhookEvent.update({ processing_status: 'COMPLETED', processed_at: new Date() });
      return;
    }

    const invoice = await Invoice.findOne({ where: { contract_invoice_hash: invoiceHash } });
    if (!invoice) {
      await webhookEvent.update({ processing_status: 'COMPLETED', processed_at: new Date() });
      return;
    }

    const result = await PaymentVerificationService.verifyPayment(transaction.hash, invoice.public_id);

    if (result.success && result.status === PAYMENT_STATUS.CONFIRMED && result.payment) {
      await this.triggerSettlement(result.payment, invoice);
    }

    await webhookEvent.update({
      processing_status: 'COMPLETED',
      processed_at: new Date(),
      failure_reason: null
    });
  }

  isOurContract(address) {
    if (!address || !process.env.CONTRACT_ADDRESS) {
      return false;
    }
    return address.toLowerCase() === process.env.CONTRACT_ADDRESS.toLowerCase();
  }

  decodeInvoiceHashFromTransaction(input) {
    try {
      if (!input || !input.startsWith('0x3a6b79b0')) {
        return null;
      }
      return `0x${input.substring(10, 74)}`;
    } catch (error) {
      logger.error('Failed to decode invoice hash', { error: error.message });
      return null;
    }
  }

  async triggerSettlement(payment, invoice) {
    try {
      const payload = {
        payment_id: payment.payment_id,
        invoice_public_id: invoice.public_id,
        transaction_hash: payment.transaction_hash,
        crypto_amount: payment.crypto_amount,
        amount_sgd: invoice.amount_sgd,
        merchant_id: invoice.merchant_id,
        timestamp: new Date().toISOString()
      };

      await axios.post(process.env.N8N_WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.N8N_API_KEY || ''
        },
        timeout: 5000
      });

      logger.info('Settlement workflow triggered', { payment_id: payment.payment_id });
    } catch (error) {
      logger.error('Failed to trigger settlement workflow', { error: error.message });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { transaction_hash: transactionHash, invoice_public_id: invoicePublicId } = req.body || {};

      if (!transactionHash || !invoicePublicId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: transaction_hash, invoice_public_id'
        });
      }

      const result = await PaymentVerificationService.verifyPayment(transactionHash, invoicePublicId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Internal verify endpoint failed', { error: error.message });
      return res.status(500).json({ success: false, status: PAYMENT_STATUS.FAILED, error: 'Internal server error' });
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const { publicId } = req.params;
      const invoice = await Invoice.findOne({ where: { public_id: publicId } });
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }

      const payment = await Payment.findOne({
        where: { invoice_id: invoice.invoice_id },
        order: [['created_at', 'DESC']]
      });

      const merchant = await Merchant.findByPk(invoice.merchant_id);

      return res.status(200).json({
        success: true,
        invoice: {
          public_id: invoice.public_id,
          status: invoice.status,
          amount_sgd: invoice.amount_sgd,
          required_crypto_amount: invoice.required_crypto_amount,
          expires_at: invoice.expires_at,
          merchant_name: merchant ? merchant.business_name : 'Merchant'
        },
        payment: payment
          ? {
              status: payment.status,
              transaction_hash: payment.transaction_hash,
              crypto_amount: payment.crypto_amount,
              confirmed_at: payment.confirmed_at,
              confirmation_count: payment.confirmation_count,
              required_confirmations: payment.required_confirmations,
              failure_reason: payment.failure_reason
            }
          : null
      });
    } catch (error) {
      logger.error('Failed to fetch payment status', { error: error.message });
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async testWebhook(req, res) {
    try {
      const { transaction_hash: transactionHash, invoice_public_id: invoicePublicId } = req.body || {};

      if (!transactionHash || !invoicePublicId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: transaction_hash, invoice_public_id'
        });
      }

      const result = await PaymentVerificationService.verifyPayment(transactionHash, invoicePublicId);
      return res.status(200).json({ success: true, result });
    } catch (error) {
      logger.error('Test webhook endpoint failed', { error: error.message });
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new WebhookController();