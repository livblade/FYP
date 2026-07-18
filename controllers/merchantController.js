// Person 2: Responsible for merchant profile and wallet management endpoints.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineMerchant = require('../models/Merchant');
const defineMerchantWallet = require('../models/MerchantWallet');
const defineInvoice = require('../models/Invoice');

const Merchant = defineMerchant(sequelize, DataTypes);
const MerchantWallet = defineMerchantWallet(sequelize, DataTypes);
const Invoice = defineInvoice(sequelize, DataTypes);

async function getMerchantFromSession(req) {
  const userId = req.session && req.session.user ? req.session.user.user_id : null;
  if (!userId) {
    return null;
  }

  return Merchant.findOne({ where: { user_id: userId } });
}

async function getProfile(req, res, next) {
  try {
    const merchant = await getMerchantFromSession(req);
    const wallets = merchant
      ? await MerchantWallet.findAll({
          where: { merchant_id: merchant.merchant_id },
          order: [['created_at', 'ASC']]
        })
      : [];

    return res.render('merchant/profile', {
      title: 'Merchant Profile',
      user: req.session.user || null,
      merchant,
      wallets,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    return next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const merchant = await getMerchantFromSession(req);
    if (!merchant) {
      return res.redirect('/merchants/profile?error=Merchant%20profile%20not%20found');
    }

    const invoices = await Invoice.findAll({ where: { merchant_id: merchant.merchant_id } });
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((item) => ['PAID', 'SETTLED'].includes(item.status)).length;
    const pendingInvoices = invoices.filter((item) => ['AWAITING_PAYMENT', 'TRANSACTION_SUBMITTED', 'CONFIRMING'].includes(item.status)).length;
    const settledSgd = invoices
      .filter((item) => item.status === 'SETTLED')
      .reduce((sum, item) => sum + Number(item.amount_sgd || 0), 0);

    return res.render('merchant/dashboard', {
      title: 'Merchant Dashboard',
      user: req.session.user || null,
      stats: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        settledSgd
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const merchant = await getMerchantFromSession(req);
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const payload = {
      business_name: req.body.business_name || merchant.business_name,
      registration_number: req.body.registration_number || null,
      business_email: req.body.business_email || null,
      business_phone: req.body.business_phone || null,
      business_address: req.body.business_address || null,
      settlement_currency: req.body.settlement_currency || merchant.settlement_currency
    };

    await merchant.update(payload);

    if (req.accepts('html')) {
      return res.redirect('/merchants/profile?success=Profile%20updated');
    }

    return res.json({ success: true, data: merchant });
  } catch (error) {
    return next(error);
  }
}

async function listWallets(req, res, next) {
  try {
    const merchant = await getMerchantFromSession(req);
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const wallets = await MerchantWallet.findAll({ where: { merchant_id: merchant.merchant_id } });
    return res.json({ success: true, data: wallets });
  } catch (error) {
    return next(error);
  }
}

async function createWallet(req, res, next) {
  try {
    const merchant = await getMerchantFromSession(req);
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const walletAddress = String(req.body.wallet_address || '').trim();
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'wallet_address is required' });
    }

    const wallet = await MerchantWallet.create({
      merchant_id: merchant.merchant_id,
      wallet_address: walletAddress,
      network: String(req.body.network || 'SEPOLIA').toUpperCase(),
      wallet_type: String(req.body.wallet_type || 'ETH').toUpperCase(),
      is_active: true,
      is_default: req.body.is_default === 'true' || req.body.is_default === true,
      label: req.body.label || null
    });

    if (req.accepts('html')) {
      return res.redirect('/merchants/profile?success=Wallet%20added');
    }

    return res.status(201).json({ success: true, data: wallet });
  } catch (error) {
    return next(error);
  }
}

async function deleteWallet(req, res, next) {
  try {
    const merchant = await getMerchantFromSession(req);
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const wallet = await MerchantWallet.findOne({
      where: {
        wallet_id: req.params.walletId,
        merchant_id: merchant.merchant_id
      }
    });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    await wallet.destroy();

    if (req.accepts('html')) {
      return res.redirect('/merchants/profile?success=Wallet%20deleted');
    }

    return res.json({ success: true, message: 'Wallet deleted' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProfile,
  getDashboard,
  updateProfile,
  listWallets,
  createWallet,
  deleteWallet
};