// Person 3: Responsible for checkout page rendering and front-end payment handoff.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineInvoice = require('../models/Invoice');
const defineMerchant = require('../models/Merchant');
const blockchainService = require('../services/blockchainService');

const Invoice = defineInvoice(sequelize, DataTypes);
const Merchant = defineMerchant(sequelize, DataTypes);

async function renderPay(req, res, next) {
  try {
    const invoice = await Invoice.findOne({
      where: { public_id: req.params.invoicePublicId }
    });

    if (!invoice) {
      return res.status(404).render('checkout/failed', {
        title: 'Invoice Not Found',
        user: req.session.user || null,
        transactionHash: null
      });
    }

    const merchant = await Merchant.findByPk(invoice.merchant_id);
    if (!invoice.contract_invoice_hash) {
      await invoice.update({
        contract_invoice_hash: blockchainService.computeInvoiceHash(invoice.public_id)
      });
    }

    return res.render('checkout/pay', {
      title: 'Checkout',
      user: req.session.user || null,
      invoice: {
        ...invoice.get({ plain: true }),
        merchant: merchant ? merchant.get({ plain: true }) : null
      },
      checkoutConfig: blockchainService.getCheckoutConfig(invoice)
    });
  } catch (error) {
    return next(error);
  }
}

function renderSuccess(req, res, next) {
  try {
    return res.render('checkout/success', {
      title: 'Payment Success',
      user: req.session.user || null,
      transactionHash: req.query.tx || null
    });
  } catch (error) {
    return next(error);
  }
}

function renderFailed(req, res, next) {
  try {
    return res.render('checkout/failed', {
      title: 'Payment Failed',
      user: req.session.user || null,
      transactionHash: req.query.tx || null
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderPay,
  renderSuccess,
  renderFailed
};
