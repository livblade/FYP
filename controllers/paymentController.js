// Person 3: Responsible for payment API placeholders and polling endpoints.
const { DataTypes } = require('sequelize');
const { randomUUID } = require('crypto');
const { sequelize } = require('../config/database');
const defineInvoice = require('../models/Invoice');
const definePayment = require('../models/Payment');

const Invoice = defineInvoice(sequelize, DataTypes);
const Payment = definePayment(sequelize, DataTypes);

async function createPaymentIntent(req, res, next) {
  try {
    const invoicePublicId = req.body.invoice_public_id || req.body.invoicePublicId;
    if (!invoicePublicId) {
      return res.status(400).json({ success: false, message: 'invoicePublicId is required' });
    }

    const invoice = await Invoice.findOne({ where: { public_id: invoicePublicId } });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const payment = await Payment.create({
      invoice_id: invoice.invoice_id,
      transaction_hash: `0x${randomUUID().replace(/-/g, '')}`,
      log_index: 0,
      chain_id: Number(process.env.SEPOLIA_CHAIN_ID || 11155111),
      payer_wallet: req.body.payer_wallet || '0x0000000000000000000000000000000000000000',
      token_address: null,
      token_symbol: invoice.accepted_token || 'ETH',
      crypto_amount: req.body.crypto_amount || '0.000000000000000000',
      usd_equivalent: null,
      block_number: null,
      confirmation_count: 0,
      required_confirmations: Number(process.env.MIN_CONFIRMATIONS || 12),
      status: 'DETECTED'
    });

    await invoice.update({ status: 'TRANSACTION_SUBMITTED' });

    return res.status(201).json({
      success: true,
      message: 'Payment intent created',
      data: {
        payment_id: payment.payment_id,
        transaction_hash: payment.transaction_hash,
        status: payment.status,
        invoice_public_id: invoice.public_id
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getPaymentStatus(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ where: { public_id: req.params.invoicePublicId } });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const payment = await Payment.findOne({
      where: { invoice_id: invoice.invoice_id },
      order: [['created_at', 'DESC']]
    });

    if (!payment) {
      return res.json({
        success: true,
        data: {
          invoice_public_id: invoice.public_id,
          invoice_status: invoice.status,
          payment_status: 'AWAITING_PAYMENT',
          transaction_hash: null
        }
      });
    }

    return res.json({
      success: true,
      data: {
        invoice_public_id: invoice.public_id,
        invoice_status: invoice.status,
        payment_status: payment.status,
        transaction_hash: payment.transaction_hash,
        confirmations: payment.confirmation_count,
        required_confirmations: payment.required_confirmations
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function listPayments(req, res, next) {
  try {
    const where = {};
    if (req.query.invoice_public_id) {
      const invoice = await Invoice.findOne({ where: { public_id: req.query.invoice_public_id } });
      if (invoice) {
        where.invoice_id = invoice.invoice_id;
      }
    }

    const payments = await Payment.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 100
    });

    return res.json({ success: true, data: payments });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPaymentIntent,
  getPaymentStatus,
  listPayments
};