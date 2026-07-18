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

async function getNotificationsByUser(userId) {
  const merchant = await Merchant.findOne({ where: { user_id: userId } });
  if (!merchant) {
    return [];
  }

  const invoices = await Invoice.findAll({
    where: { merchant_id: merchant.merchant_id },
    order: [['created_at', 'DESC']],
    limit: 8
  });

  const invoiceIds = invoices.map((item) => item.invoice_id);
  const payments = invoiceIds.length
    ? await Payment.findAll({ where: { invoice_id: invoiceIds }, order: [['created_at', 'DESC']], limit: 8 })
    : [];

  const settlements = await Settlement.findAll({
    where: { merchant_id: merchant.merchant_id },
    order: [['created_at', 'DESC']],
    limit: 8
  });

  const notifications = [];

  invoices.forEach((invoice) => {
    notifications.push({
      type: 'invoice',
      level: ['EXPIRED', 'FAILED'].includes(invoice.status) ? 'warning' : 'info',
      title: `Invoice ${invoice.public_id}`,
      message: `Status changed to ${invoice.status}`,
      created_at: invoice.updated_at || invoice.created_at
    });
  });

  payments.forEach((payment) => {
    notifications.push({
      type: 'payment',
      level: payment.status === 'CONFIRMED' ? 'success' : 'info',
      title: `Payment ${payment.payment_id}`,
      message: `Payment is ${payment.status}`,
      created_at: payment.updated_at || payment.created_at
    });
  });

  settlements.forEach((settlement) => {
    notifications.push({
      type: 'settlement',
      level: settlement.status === 'COMPLETED' ? 'success' : 'info',
      title: `Settlement ${settlement.settlement_reference}`,
      message: `Settlement is ${settlement.status}`,
      created_at: settlement.updated_at || settlement.created_at
    });
  });

  return notifications
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);
}

async function renderList(req, res, next) {
  try {
    const user = req.session.user || null;
    const notifications = user ? await getNotificationsByUser(user.user_id) : [];
    return res.render('notifications/index', {
      title: 'Notifications',
      user,
      notifications
    });
  } catch (error) {
    return next(error);
  }
}

async function getRecent(req, res, next) {
  try {
    const user = req.session.user || null;
    const notifications = user ? await getNotificationsByUser(user.user_id) : [];
    return res.json({ success: true, data: notifications.slice(0, 5) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderList,
  getRecent
};
