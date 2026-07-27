// Person 4: Responsible for settlement processing endpoints and review flows.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineMerchant = require('../models/Merchant');
const defineInvoice = require('../models/Invoice');
const definePayment = require('../models/Payment');
const defineSettlement = require('../models/Settlement');
const settlementService = require('../services/settlementService');
const auditLogService = require('../services/auditLogService');
const { SETTLEMENT_STATUS } = require('../config/constants');

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

function isAdminUser(sessionUser) {
  return sessionUser && sessionUser.role === 'ADMIN';
}

async function getSettlementScope(sessionUser) {
  if (isAdminUser(sessionUser)) {
    return {
      isAdmin: true,
      merchant: null,
      where: {}
    };
  }

  const merchant = await getMerchantBySessionUser(sessionUser);
  if (!merchant) {
    return null;
  }

  return {
    isAdmin: false,
    merchant,
    where: { merchant_id: merchant.merchant_id }
  };
}

async function findSettlementForSession(sessionUser, settlementReference) {
  const scope = await getSettlementScope(sessionUser);
  if (!scope) {
    return null;
  }

  return Settlement.findOne({
    where: {
      ...scope.where,
      settlement_reference: settlementReference
    }
  });
}

async function renderList(req, res, next) {
  try {
    const sessionUser = req.session.user || null;
    const scope = await getSettlementScope(sessionUser);
    const settlements = scope
      ? await Settlement.findAll({
          where: scope.where,
          order: [['created_at', 'DESC']]
        })
      : [];

    return res.render('settlements/list', {
      title: 'Settlements',
      user: sessionUser,
      settlements,
      isAdmin: Boolean(scope?.isAdmin),
      statusOptions: Object.values(SETTLEMENT_STATUS)
    });
  } catch (error) {
    return next(error);
  }
}

async function listSettlementsApi(req, res, next) {
  try {
    const scope = await getSettlementScope(req.session.user || null);
    if (!scope) {
      return res.status(400).json({ success: false, message: 'Merchant profile not found' });
    }

    const settlements = await Settlement.findAll({
      where: scope.where,
      order: [['created_at', 'DESC']],
      limit: 200
    });

    return res.json({ success: true, data: settlements });
  } catch (error) {
    return next(error);
  }
}

async function renderDetail(req, res, next) {
  try {
    const sessionUser = req.session.user || null;
    const scope = await getSettlementScope(sessionUser);
    if (!scope) {
      return res.redirect('/settlements');
    }

    const settlement = await findSettlementForSession(sessionUser, req.params.publicId);

    if (!settlement) {
      return res.status(404).render('settlements/detail', {
        title: 'Settlement Not Found',
        user: sessionUser,
        settlement: null,
        isAdmin: Boolean(scope.isAdmin),
        statusOptions: Object.values(SETTLEMENT_STATUS)
      });
    }

    return res.render('settlements/detail', {
      title: `Settlement ${settlement.settlement_reference}`,
      user: sessionUser,
      settlement,
      isAdmin: Boolean(scope.isAdmin),
      statusOptions: Object.values(SETTLEMENT_STATUS)
    });
  } catch (error) {
    return next(error);
  }
}

async function getSettlementDetailApi(req, res, next) {
  try {
    const scope = await getSettlementScope(req.session.user || null);
    if (!scope) {
      return res.status(400).json({ success: false, message: 'Merchant profile not found' });
    }

    const settlement = await findSettlementForSession(req.session.user || null, req.params.publicId);

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    return res.json({ success: true, data: settlement });
  } catch (error) {
    return next(error);
  }
}

async function createSettlement(req, res, next) {
  try {
    const sessionUser = req.session.user || null;
    const scope = await getSettlementScope(sessionUser);
    if (!scope) {
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
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found for payment' });
    }

    if (!scope.isAdmin && invoice.merchant_id !== scope.merchant.merchant_id) {
      return res.status(403).json({ success: false, message: 'Payment does not belong to this merchant' });
    }

    const settlement = await settlementService.createSettlementForPayment({
      paymentId: payment.payment_id,
      merchantId: scope.isAdmin ? invoice.merchant_id : scope.merchant.merchant_id,
      providerReference: req.body.provider_reference || null,
      payoutAddress: req.body.payout_address || null
    });

    await auditLogService.logAction({
      req,
      userId: req.session && req.session.user ? req.session.user.user_id : null,
      action: 'SETTLEMENT_CREATED',
      entityType: 'settlement',
      entityId: settlement.settlement_id,
      newValues: settlement.get({ plain: true }),
      metadata: {
        settlement_reference: settlement.settlement_reference,
        managed_by_role: sessionUser ? sessionUser.role : null
      }
    });

    if (req.accepts('html')) {
      return res.redirect(`/settlements/${settlement.settlement_reference}`);
    }

    return res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    return next(error);
  }
}

async function updateSettlementStatus(req, res, next) {
  try {
    const sessionUser = req.session.user || null;
    const scope = await getSettlementScope(sessionUser);
    if (!scope) {
      return res.status(400).json({ success: false, message: 'Merchant profile not found' });
    }

    const settlement = await findSettlementForSession(sessionUser, req.params.publicId);

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    const oldValues = settlement.get({ plain: true });
    const updated = await settlementService.updateSettlementStatus(
      settlement.settlement_reference,
      String(req.body.status || '').toUpperCase(),
      req.body.failure_reason || null
    );

    await auditLogService.logAction({
      req,
      userId: req.session && req.session.user ? req.session.user.user_id : null,
      action: 'SETTLEMENT_STATUS_UPDATED',
      entityType: 'settlement',
      entityId: updated.settlement_id,
      oldValues,
      newValues: updated.get({ plain: true }),
      metadata: {
        settlement_reference: updated.settlement_reference,
        managed_by_role: sessionUser ? sessionUser.role : null
      }
    });

    const acceptHeader = req.get('accept') || '';
    if (acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
      return res.redirect(`/settlements/${updated.settlement_reference}`);
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

async function reconcileSettlements(req, res, next) {
  try {
    const sessionUser = req.session.user || null;
    const scope = await getSettlementScope(sessionUser);
    if (!scope) {
      return res.status(400).json({ success: false, message: 'Merchant profile not found' });
    }

    const result = await settlementService.reconcileMerchantSettlements(scope.isAdmin ? null : scope.merchant.merchant_id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderList,
  listSettlementsApi,
  renderDetail,
  getSettlementDetailApi,
  createSettlement,
  updateSettlementStatus,
  reconcileSettlements
};
