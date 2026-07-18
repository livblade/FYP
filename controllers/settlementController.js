// Person 4: Responsible for settlement processing endpoints and review flows.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineMerchant = require('../models/Merchant');
const defineInvoice = require('../models/Invoice');
const definePayment = require('../models/Payment');
const defineSettlement = require('../models/Settlement');

const Merchant = defineMerchant(sequelize, DataTypes);
const Invoice = defineInvoice(sequelize, DataTypes);
const Payment = definePayment(sequelize, DataTypes);
const Settlement = defineSettlement(sequelize, DataTypes);

async function getMerchantBySessionUser(sessionUser) {
  if (!sessionUser || !sessionUser.user_id) {
    return null;
  }

  return Merchant.findOne({ where: { user_id: sessionUser.user_id } });
}

function generateSettlementReference() {
  return `SIM-SGD-${Date.now()}`;
}

async function renderList(req, res, next) {
  try {
    const merchant = await getMerchantBySessionUser(req.session.user || null);
    const settlements = merchant
      ? await Settlement.findAll({
          where: { merchant_id: merchant.merchant_id },
          order: [['created_at', 'DESC']]
        })
      : [];

    return res.render('settlements/list', {
      title: 'Settlements',
      user: req.session.user || null,
      settlements
    });
  } catch (error) {
    return next(error);
  }
}

async function renderDetail(req, res, next) {
  try {
    const merchant = await getMerchantBySessionUser(req.session.user || null);
    if (!merchant) {
      return res.redirect('/settlements');
    }

    const settlement = await Settlement.findOne({
      where: {
        merchant_id: merchant.merchant_id,
        settlement_reference: req.params.publicId
      }
    });

    if (!settlement) {
      return res.status(404).render('settlements/detail', {
        title: 'Settlement Not Found',
        user: req.session.user || null,
        settlement: null
      });
    }

    return res.render('settlements/detail', {
      title: `Settlement ${settlement.settlement_reference}`,
      user: req.session.user || null,
      settlement
    });
  } catch (error) {
    return next(error);
  }
}

async function createSettlement(req, res, next) {
  try {
    const merchant = await getMerchantBySessionUser(req.session.user || null);
    if (!merchant) {
      return res.status(400).json({ success: false, message: 'Merchant profile not found' });
    }

    const paymentId = Number(req.body.payment_id);
    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'payment_id is required' });
    }

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const invoice = await Invoice.findByPk(payment.invoice_id);
    if (!invoice || invoice.merchant_id !== merchant.merchant_id) {
      return res.status(403).json({ success: false, message: 'Payment does not belong to this merchant' });
    }

    const alreadySettled = await Settlement.findOne({ where: { payment_id: payment.payment_id } });
    if (alreadySettled) {
      return res.status(409).json({ success: false, message: 'Settlement already exists for this payment' });
    }

    const gross = Number(invoice.amount_sgd);
    const platformFee = (gross * Number(merchant.platform_fee_percentage || 0)) / 100;
    const conversionFee = (gross * Number(merchant.conversion_fee_percentage || 0)) / 100;
    const net = gross - platformFee - conversionFee;

    const settlement = await Settlement.create({
      merchant_id: merchant.merchant_id,
      payment_id: payment.payment_id,
      gross_amount_sgd: gross,
      platform_fee_sgd: platformFee,
      conversion_fee_sgd: conversionFee,
      net_amount_sgd: net,
      settlement_reference: generateSettlementReference(),
      provider_reference: req.body.provider_reference || null,
      payout_address: req.body.payout_address || null,
      status: 'CREATED',
      settled_at: new Date()
    });

    await invoice.update({ status: 'SETTLED' });

    if (req.accepts('html')) {
      return res.redirect(`/settlements/${settlement.settlement_reference}`);
    }

    return res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderList,
  renderDetail,
  createSettlement
};