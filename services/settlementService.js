// Person 4: Responsible for settlement batching and reconciliation logic.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineInvoice = require('../models/Invoice');
const definePayment = require('../models/Payment');
const defineMerchant = require('../models/Merchant');
const defineSettlement = require('../models/Settlement');
const { INVOICE_STATUS, PAYMENT_STATUS, SETTLEMENT_STATUS } = require('../config/constants');

const Invoice = defineInvoice(sequelize, DataTypes);
const Payment = definePayment(sequelize, DataTypes);
const Merchant = defineMerchant(sequelize, DataTypes);
const Settlement = defineSettlement(sequelize, DataTypes);

function generateSettlementReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SIM-SGD-${Date.now()}-${random}`;
}

function computeSettlementBreakdown(invoiceAmount, merchant) {
  const gross = Number(invoiceAmount || 0);
  const platformFeePct = Number(merchant?.platform_fee_percentage || process.env.PLATFORM_FEE_PERCENTAGE || 1);
  const conversionFeePct = Number(merchant?.conversion_fee_percentage || process.env.CONVERSION_FEE_PERCENTAGE || 0.5);

  const platformFee = (gross * platformFeePct) / 100;
  const conversionFee = (gross * conversionFeePct) / 100;
  const net = gross - platformFee - conversionFee;

  return {
    gross_amount_sgd: Number(gross.toFixed(6)),
    platform_fee_sgd: Number(platformFee.toFixed(6)),
    conversion_fee_sgd: Number(conversionFee.toFixed(6)),
    net_amount_sgd: Number(net.toFixed(6))
  };
}

async function createSettlementForPayment({ paymentId, merchantId = null, payoutAddress = null, providerReference = null }) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== PAYMENT_STATUS.CONFIRMED) {
    throw new Error('Settlement can only be created for CONFIRMED payments');
  }

  const existing = await Settlement.findOne({ where: { payment_id: payment.payment_id } });
  if (existing) {
    return existing;
  }

  const invoice = await Invoice.findByPk(payment.invoice_id);
  if (!invoice) {
    throw new Error('Invoice not found for payment');
  }

  const effectiveMerchantId = merchantId || invoice.merchant_id;
  if (merchantId && Number(merchantId) !== Number(invoice.merchant_id)) {
    throw new Error('Payment does not belong to the provided merchant');
  }

  const merchant = await Merchant.findByPk(effectiveMerchantId);
  if (!merchant) {
    throw new Error('Merchant not found');
  }

  const amounts = computeSettlementBreakdown(invoice.amount_sgd, merchant);

  const settlement = await Settlement.create({
    merchant_id: merchant.merchant_id,
    payment_id: payment.payment_id,
    ...amounts,
    settlement_reference: generateSettlementReference(),
    provider_reference: providerReference || null,
    payout_address: payoutAddress || null,
    status: SETTLEMENT_STATUS.CREATED,
    settled_at: new Date()
  });

  await invoice.update({ status: INVOICE_STATUS.SETTLED });

  return settlement;
}

async function updateSettlementStatus(settlementReference, status, failureReason = null) {
  const settlement = await Settlement.findOne({ where: { settlement_reference: settlementReference } });
  if (!settlement) {
    throw new Error('Settlement not found');
  }

  const allowedStatuses = Object.values(SETTLEMENT_STATUS);
  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid settlement status');
  }

  await settlement.update({
    status,
    failure_reason: failureReason || null,
    completed_at: status === SETTLEMENT_STATUS.COMPLETED ? new Date() : settlement.completed_at
  });

  return settlement;
}

async function reconcileMerchantSettlements(merchantId) {
  const where = merchantId ? { merchant_id: Number(merchantId) } : {};
  const settlements = await Settlement.findAll({ where, order: [['created_at', 'DESC']] });

  const summary = {
    total: settlements.length,
    created: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    manual_review: 0
  };

  for (const settlement of settlements) {
    switch (settlement.status) {
      case SETTLEMENT_STATUS.CREATED:
        summary.created += 1;
        break;
      case SETTLEMENT_STATUS.PROCESSING:
        summary.processing += 1;
        break;
      case SETTLEMENT_STATUS.COMPLETED:
        summary.completed += 1;
        break;
      case SETTLEMENT_STATUS.FAILED:
        summary.failed += 1;
        break;
      case SETTLEMENT_STATUS.MANUAL_REVIEW:
        summary.manual_review += 1;
        break;
      default:
        break;
    }
  }

  return {
    summary,
    settlements
  };
}

async function createSettlementBatch(paymentIds = []) {
  const created = [];
  const failed = [];

  for (const paymentId of paymentIds) {
    try {
      const settlement = await createSettlementForPayment({ paymentId: Number(paymentId) });
      created.push(settlement);
    } catch (error) {
      failed.push({ payment_id: Number(paymentId), error: error.message });
    }
  }

  return {
    success: true,
    created_count: created.length,
    failed_count: failed.length,
    created,
    failed
  };
}

module.exports = {
  computeSettlementBreakdown,
  createSettlementForPayment,
  updateSettlementStatus,
  reconcileMerchantSettlements,
  createSettlementBatch
};