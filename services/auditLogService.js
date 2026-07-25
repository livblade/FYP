const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const defineAuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const AuditLog = defineAuditLog(sequelize, DataTypes);

function toJsonSafe(value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonSafe(entry));
  }

  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = toJsonSafe(entry);
    }
    return result;
  }

  return value;
}

function getClientIp(req) {
  if (!req) {
    return null;
  }

  const forwardedFor = req.headers && req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return String(forwardedFor).split(',')[0].trim();
  }

  return req.ip || (req.connection && req.connection.remoteAddress) || null;
}

async function logAction({
  req = null,
  userId = null,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  metadata = null
}) {
  try {
    if (!action || !entityType) {
      return null;
    }

    return await AuditLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      old_values: toJsonSafe(oldValues),
      new_values: toJsonSafe(newValues),
      ip_address: getClientIp(req),
      user_agent: req && req.headers ? req.headers['user-agent'] || null : null,
      metadata: toJsonSafe(metadata)
    });
  } catch (error) {
    logger.error('Failed to write audit log', { error: error.message, action, entityType, entityId });
    return null;
  }
}

module.exports = {
  logAction
};
