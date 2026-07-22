// Person 3: Responsible for payment API placeholders and polling endpoints.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineInvoice = require('../models/Invoice');
const definePayment = require('../models/Payment');
const { INVOICE_STATUS, PAYMENT_STATUS } = require('../config/constants');
const blockchainService = require('../services/blockchainService');

const Invoice = defineInvoice(sequelize, DataTypes);
const Payment = definePayment(sequelize, DataTypes);

const ETH_TRANSACTION_HASH_PATTERN = /^0x([A-Fa-f0-9]{64})$/;
const ETH_ADDRESS_PATTERN = /^0x([A-Fa-f0-9]{40})$/;

function normalizeTransactionHash(transactionHash) {
  return String(transactionHash || '').trim().toLowerCase();
}

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

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

    return res.json({
      success: true,
      message: 'Payment intent prepared',
      data: {
        invoice_public_id: invoice.public_id,
        accepted_token: invoice.accepted_token || 'ETH',
        crypto_amount: invoice.required_crypto_amount,
        contract: blockchainService.getCheckoutConfig(invoice)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function submitPayment(req, res, next) {
  try {
    const invoicePublicId = req.body.invoice_public_id || req.body.invoicePublicId;
    const transactionHash = normalizeTransactionHash(req.body.transaction_hash || req.body.transactionHash);
    const walletAddress = normalizeAddress(req.body.wallet_address || req.body.walletAddress || req.body.payer_wallet);
    const chainId = Number(req.body.chain_id || req.body.chainId || process.env.SEPOLIA_CHAIN_ID || 11155111);

    if (!invoicePublicId) {
      return res.status(400).json({ success: false, message: 'invoice_public_id is required' });
    }
    if (!ETH_TRANSACTION_HASH_PATTERN.test(transactionHash)) {
      return res.status(400).json({ success: false, message: 'Valid transaction_hash is required' });
    }
    if (!ETH_ADDRESS_PATTERN.test(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Valid wallet_address is required' });
    }
    if (chainId !== Number(process.env.SEPOLIA_CHAIN_ID || 11155111)) {
      return res.status(400).json({ success: false, message: 'Payment must be submitted on Sepolia' });
    }

    const invoice = await Invoice.findOne({ where: { public_id: invoicePublicId } });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (new Date(invoice.expires_at).getTime() <= Date.now()) {
      await invoice.update({ status: INVOICE_STATUS.EXPIRED });
      return res.status(409).json({ success: false, message: 'Invoice has expired' });
    }

    const existingPayment = await Payment.findOne({ where: { transaction_hash: transactionHash } });
    if (existingPayment) {
      return res.json({
        success: true,
        message: 'Transaction hash already submitted',
        data: {
          payment_id: existingPayment.payment_id,
          transaction_hash: existingPayment.transaction_hash,
          status: existingPayment.status,
          invoice_public_id: invoice.public_id
        }
      });
    }

    const payment = await Payment.create({
      invoice_id: invoice.invoice_id,
      transaction_hash: transactionHash,
      log_index: 0,
      chain_id: chainId,
      payer_wallet: walletAddress,
      token_address: null,
      token_symbol: invoice.accepted_token || 'ETH',
      crypto_amount: req.body.crypto_amount || invoice.required_crypto_amount || '0.000000000000000000',
      usd_equivalent: null,
      block_number: null,
      confirmation_count: 0,
      required_confirmations: Number(process.env.MIN_CONFIRMATIONS || 12),
      status: PAYMENT_STATUS.DETECTED
    });

    await invoice.update({
      status: INVOICE_STATUS.TRANSACTION_SUBMITTED,
      payment_attempts: Number(invoice.payment_attempts || 0) + 1
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction submitted for independent verification',
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
  submitPayment,
  getPaymentStatus,
  listPayments
};
