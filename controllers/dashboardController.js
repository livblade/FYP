// Person 1: Responsible for shared dashboard pages and summary API placeholders.
const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const defineMerchant = require('../models/Merchant');
const defineInvoice = require('../models/Invoice');
const definePayment = require('../models/Payment');
const defineSettlement = require('../models/Settlement');

const Merchant = defineMerchant(sequelize, DataTypes);
const Invoice = defineInvoice(sequelize, DataTypes);
const Payment = definePayment(sequelize, DataTypes);
const Settlement = defineSettlement(sequelize, DataTypes);

async function renderIndex(req, res, next) {
  try {
    return res.render('dashboard/index', {
      title: 'Platform Dashboard',
      user: req.session.user || null
    });
  } catch (error) {
    return next(error);
  }
}

async function getMetrics(req, res, next) {
  try {
    const sessionUser = req.session.user || null;
    if (!sessionUser || !sessionUser.user_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const merchant = await Merchant.findOne({ where: { user_id: sessionUser.user_id } });
    if (!merchant) {
      return res.json({
        success: true,
        data: {
          totals: {
            revenue_sgd: 0,
            transaction_count: 0,
            pending_payments: 0,
            settlement_count: 0
          },
          recent_invoices: []
        }
      });
    }

    const invoices = await Invoice.findAll({
      where: { merchant_id: merchant.merchant_id },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    const invoiceIds = invoices.map((invoice) => invoice.invoice_id);
    const allMerchantInvoices = await Invoice.findAll({
      where: { merchant_id: merchant.merchant_id }
    });
    const allMerchantInvoiceIds = allMerchantInvoices.map((invoice) => invoice.invoice_id);

    const payments = allMerchantInvoiceIds.length
      ? await Payment.findAll({ where: { invoice_id: allMerchantInvoiceIds } })
      : [];

    const pendingPayments = payments.filter((payment) => {
      return ['DETECTED', 'VERIFYING', 'CONFIRMING'].includes(payment.status);
    }).length;

    const settlements = await Settlement.findAll({ where: { merchant_id: merchant.merchant_id } });

    const settlementPaymentIds = settlements.map((settlement) => settlement.payment_id).filter(Boolean);
    const settlementPayments = settlementPaymentIds.length
      ? await Payment.findAll({ where: { payment_id: settlementPaymentIds } })
      : [];
    const paymentById = new Map(settlementPayments.map((payment) => [payment.payment_id, payment]));

    let settlementDurationMinutesTotal = 0;
    let settlementDurationSamples = 0;
    for (const settlement of settlements) {
      const payment = paymentById.get(settlement.payment_id);
      const startAt = payment && (payment.confirmed_at || payment.created_at);
      const endAt = settlement.completed_at || settlement.settled_at || settlement.created_at;

      if (!startAt || !endAt) {
        continue;
      }

      const startMs = new Date(startAt).getTime();
      const endMs = new Date(endAt).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
        continue;
      }

      settlementDurationMinutesTotal += (endMs - startMs) / 60000;
      settlementDurationSamples += 1;
    }

    const avgSettlementTimeMinutes = settlementDurationSamples
      ? settlementDurationMinutesTotal / settlementDurationSamples
      : 0;

    const paidInvoices = allMerchantInvoices.filter((invoice) => {
      return ['PAID', 'SETTLEMENT_PENDING', 'SETTLED'].includes(invoice.status);
    });

    const revenue = paidInvoices.reduce((sum, invoice) => {
      return sum + Number(invoice.amount_sgd || 0);
    }, 0);

    const recentPayments = invoiceIds.length
      ? await Payment.findAll({
          where: { invoice_id: invoiceIds },
          order: [['created_at', 'DESC']]
        })
      : [];

    const latestPaymentByInvoiceId = new Map();
    for (const payment of recentPayments) {
      if (!latestPaymentByInvoiceId.has(payment.invoice_id)) {
        latestPaymentByInvoiceId.set(payment.invoice_id, payment);
      }
    }

    return res.json({
      success: true,
      data: {
        totals: {
          revenue_sgd: Number(revenue.toFixed(2)),
          transaction_count: payments.length,
          pending_payments: pendingPayments,
          settlement_count: settlements.length,
          avg_settlement_time_minutes: Number(avgSettlementTimeMinutes.toFixed(1))
        },
        recent_invoices: invoices.map((invoice) => {
          const latestPayment = latestPaymentByInvoiceId.get(invoice.invoice_id);
          return {
            public_id: invoice.public_id,
            amount_sgd: Number(invoice.amount_sgd),
            status: invoice.status,
            created_at: invoice.created_at,
            payment_status: latestPayment ? latestPayment.status : null
          };
        })
      }
    });
  } catch (error) {
    return next(error);
  }
}

function buildDateRangeFilter(from, to) {
  const filter = {};
  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime())) {
      filter[Op.gte] = fromDate;
    }
  }
  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime())) {
      filter[Op.lte] = toDate;
    }
  }
  return Object.keys(filter).length ? filter : null;
}

async function getPaymentHistory(req, res, next) {
  try {
    const sessionUser = req.session.user || null;
    if (!sessionUser || !sessionUser.user_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const merchant = await Merchant.findOne({ where: { user_id: sessionUser.user_id } });
    if (!merchant) {
      return res.json({ success: true, data: [] });
    }

    const invoices = await Invoice.findAll({ where: { merchant_id: merchant.merchant_id } });
    const invoiceIds = invoices.map((invoice) => invoice.invoice_id);
    if (!invoiceIds.length) {
      return res.json({ success: true, data: [] });
    }

    const where = { invoice_id: invoiceIds };
    if (req.query.status) {
      where.status = String(req.query.status).toUpperCase();
    }

    const dateRange = buildDateRangeFilter(req.query.from, req.query.to);
    if (dateRange) {
      where.created_at = dateRange;
    }

    const payments = await Payment.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 200
    });

    return res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    return next(error);
  }
}

async function getSettlementHistory(req, res, next) {
  try {
    const sessionUser = req.session.user || null;
    if (!sessionUser || !sessionUser.user_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const merchant = await Merchant.findOne({ where: { user_id: sessionUser.user_id } });
    if (!merchant) {
      return res.json({ success: true, data: [] });
    }

    const where = { merchant_id: merchant.merchant_id };
    if (req.query.status) {
      where.status = String(req.query.status).toUpperCase();
    }

    const dateRange = buildDateRangeFilter(req.query.from, req.query.to);
    if (dateRange) {
      where.created_at = dateRange;
    }

    const settlements = await Settlement.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 200
    });

    return res.json({
      success: true,
      data: settlements
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderIndex,
  getMetrics,
  getPaymentHistory,
  getSettlementHistory
};