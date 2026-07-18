// Person 3: Responsible for invoice CRUD endpoints and view rendering.
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

function generatePublicInvoiceId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${random}`;
}

async function getMerchantBySessionUser(sessionUser) {
  if (!sessionUser || !sessionUser.user_id) {
    return null;
  }

  return Merchant.findOne({ where: { user_id: sessionUser.user_id } });
}

async function renderCreate(req, res, next) {
  try {
    return res.render('invoices/create', {
      title: 'Create Invoice',
      user: req.session.user || null,
      error: req.query.error || null
    });
  } catch (error) {
    return next(error);
  }
}

async function renderList(req, res, next) {
  try {
    const merchant = await getMerchantBySessionUser(req.session.user || null);
    const invoices = merchant
      ? await Invoice.findAll({
          where: { merchant_id: merchant.merchant_id },
          order: [['created_at', 'DESC']]
        })
      : [];

    return res.render('invoices/list', {
      title: 'Invoice List',
      user: req.session.user || null,
      invoices
    });
  } catch (error) {
    return next(error);
  }
}

async function renderDetail(req, res, next) {
  try {
    const merchant = await getMerchantBySessionUser(req.session.user || null);
    if (!merchant) {
      return res.redirect('/invoices?error=Merchant%20profile%20not%20found');
    }

    const invoice = await Invoice.findOne({
      where: {
        public_id: req.params.publicId,
        merchant_id: merchant.merchant_id
      }
    });

    if (!invoice) {
      return res.status(404).render('invoices/detail', {
        title: 'Invoice Not Found',
        user: req.session.user || null,
        invoice: null,
        payments: []
      });
    }

    const payments = await Payment.findAll({
      where: { invoice_id: invoice.invoice_id },
      order: [['created_at', 'DESC']]
    });

    const paymentIds = payments.map((payment) => payment.payment_id);
    const settlements = paymentIds.length
      ? await Settlement.findAll({ where: { payment_id: paymentIds } })
      : [];
    const settlementsByPaymentId = new Map(settlements.map((item) => [item.payment_id, item]));

    const paymentsWithSettlement = payments.map((payment) => {
      const plain = payment.get({ plain: true });
      plain.settlement = settlementsByPaymentId.get(payment.payment_id) || null;
      return plain;
    });

    return res.render('invoices/detail', {
      title: `Invoice ${invoice.public_id}`,
      user: req.session.user || null,
      invoice,
      payments: paymentsWithSettlement
    });
  } catch (error) {
    return next(error);
  }
}

async function createInvoice(req, res, next) {
  try {
    const merchant = await getMerchantBySessionUser(req.session.user || null);
    if (!merchant) {
      return res.status(400).json({ success: false, message: 'Merchant profile not found' });
    }

    const amountSgd = Number(req.body.amount_sgd);
    const acceptedToken = String(req.body.accepted_token || 'ETH').toUpperCase();
    const expiresMinutes = Number(req.body.expiry_minutes || 15);
    const expiresAt = req.body.expires_at
      ? new Date(req.body.expires_at)
      : new Date(Date.now() + expiresMinutes * 60 * 1000);

    const publicId = generatePublicInvoiceId();
    const paymentLink = `${req.protocol}://${req.get('host')}/payments/checkout/${publicId}`;

    const invoice = await Invoice.create({
      public_id: publicId,
      merchant_id: merchant.merchant_id,
      customer_email: req.body.customer_email || null,
      customer_name: req.body.customer_name || null,
      description: req.body.description || null,
      amount_sgd: amountSgd,
      accepted_token: acceptedToken,
      required_crypto_amount: null,
      quote_id: `Q-${Date.now()}`,
      contract_invoice_hash: null,
      payment_link: paymentLink,
      expires_at: expiresAt,
      status: 'AWAITING_PAYMENT'
    });

    if (req.accepts('html')) {
      return res.redirect(`/invoices/${invoice.public_id}`);
    }

    return res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
}

async function updateInvoice(req, res, next) {
  try {
    const merchant = await getMerchantBySessionUser(req.session.user || null);
    if (!merchant) {
      return res.status(400).json({ success: false, message: 'Merchant profile not found' });
    }

    const invoice = await Invoice.findOne({
      where: {
        public_id: req.params.publicId,
        merchant_id: merchant.merchant_id
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const updates = {};
    if (req.body.status) {
      updates.status = req.body.status;
    }
    if (req.body.description !== undefined) {
      updates.description = req.body.description;
    }
    if (req.body.expires_at) {
      updates.expires_at = new Date(req.body.expires_at);
    }

    await invoice.update(updates);

    if (req.accepts('html')) {
      return res.redirect(`/invoices/${invoice.public_id}`);
    }

    return res.json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
}

async function deleteInvoice(req, res, next) {
  try {
    const merchant = await getMerchantBySessionUser(req.session.user || null);
    if (!merchant) {
      return res.status(400).json({ success: false, message: 'Merchant profile not found' });
    }

    const invoice = await Invoice.findOne({
      where: {
        public_id: req.params.publicId,
        merchant_id: merchant.merchant_id
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    await invoice.destroy();

    if (req.accepts('html')) {
      return res.redirect('/invoices');
    }

    return res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderCreate,
  renderList,
  renderDetail,
  createInvoice,
  updateInvoice,
  deleteInvoice
};