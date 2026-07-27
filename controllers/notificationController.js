const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineMerchant = require('../models/Merchant');
const defineInvoice = require('../models/Invoice');
const definePayment = require('../models/Payment');
const defineSettlement = require('../models/Settlement');
const defineAuditLog = require('../models/AuditLog');

const Merchant = defineMerchant(sequelize, DataTypes);
const Invoice = defineInvoice(sequelize, DataTypes);
const Payment = definePayment(sequelize, DataTypes);
const Settlement = defineSettlement(sequelize, DataTypes);
const AuditLog = defineAuditLog(sequelize, DataTypes);

function notificationLevelForStatus(status) {
  if (['COMPLETED', 'CONFIRMED', 'PAID', 'SETTLED'].includes(status)) {
    return 'success';
  }
  if (['EXPIRED', 'FAILED', 'REJECTED', 'UNDERPAID', 'OVERPAID', 'MANUAL_REVIEW'].includes(status)) {
    return 'warning';
  }
  return 'info';
}

function notificationTime(record) {
  return record.updated_at || record.created_at || new Date();
}

async function getMerchantNotifications(userId) {
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
      level: notificationLevelForStatus(invoice.status),
      title: `Invoice ${invoice.public_id}`,
      message: `Status changed to ${invoice.status}`,
      href: `/invoices/${invoice.public_id}`,
      created_at: notificationTime(invoice)
    });
  });

  payments.forEach((payment) => {
    notifications.push({
      type: 'payment',
      level: notificationLevelForStatus(payment.status),
      title: `Payment ${payment.payment_id}`,
      message: `Payment is ${payment.status}`,
      href: '/dashboard',
      created_at: notificationTime(payment)
    });
  });

  settlements.forEach((settlement) => {
    notifications.push({
      type: 'settlement',
      level: notificationLevelForStatus(settlement.status),
      title: `Settlement ${settlement.settlement_reference}`,
      message: `Settlement is ${settlement.status}`,
      href: `/settlements/${settlement.settlement_reference}`,
      created_at: notificationTime(settlement)
    });
  });

  return notifications
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);
}

async function getAdminNotifications() {
  const [settlements, auditLogs] = await Promise.all([
    Settlement.findAll({
      order: [['created_at', 'DESC']],
      limit: 10
    }),
    AuditLog.findAll({
      order: [['created_at', 'DESC']],
      limit: 10
    })
  ]);

  const settlementNotifications = settlements.map((settlement) => ({
    type: 'settlement',
    level: notificationLevelForStatus(settlement.status),
    title: `Settlement ${settlement.settlement_reference}`,
    message: `Merchant ${settlement.merchant_id} settlement is ${settlement.status}`,
    href: `/settlements/${settlement.settlement_reference}`,
    created_at: notificationTime(settlement)
  }));

  const auditNotifications = auditLogs.map((log) => ({
    type: 'audit',
    level: String(log.action || '').includes('FAILED') ? 'warning' : 'info',
    title: `Audit ${log.action}`,
    message: `${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ''}`,
    href: '/audits',
    created_at: log.created_at || new Date()
  }));

  return [...auditNotifications, ...settlementNotifications].slice(0, 20);
}

async function getNotificationsByUser(user) {
  if (!user || !user.user_id) {
    return [];
  }

  if (user.role === 'ADMIN') {
    return getAdminNotifications();
  }

  return getMerchantNotifications(user.user_id);
}

async function renderList(req, res, next) {
  try {
    const user = req.session.user || null;
    const notifications = await getNotificationsByUser(user);
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
    const notifications = await getNotificationsByUser(user);
    return res.json({ success: true, data: notifications.slice(0, 5) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderList,
  getRecent,
  getNotificationsByUser
};
