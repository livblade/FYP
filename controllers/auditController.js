// Person 4: Responsible for audit log review UI.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineAuditLog = require('../models/AuditLog');
const defineUser = require('../models/User');

const AuditLog = defineAuditLog(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);

// This association allows us to fetch user details along with the audit log.
AuditLog.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(AuditLog, { foreignKey: 'user_id' });

async function renderList(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      include: [{
        model: User,
        attributes: ['name', 'email'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return res.render('audits/list', {
      title: 'Audit Logs',
      user: req.session.user || null,
      logs,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      limit
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderList
};