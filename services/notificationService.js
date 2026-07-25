// Person 1: Responsible for email, webhook, and in-app notification integration.
const logger = require('../utils/logger');

async function sendNotification({ channel = 'in-app', target = null, title = 'Notification', message = '' } = {}) {
  const payload = {
    channel,
    target,
    title,
    message,
    sent_at: new Date().toISOString()
  };

  // Local-first notification path for development without external providers.
  logger.info('Notification dispatched', payload);

  return {
    success: true,
    mode: 'local-log',
    data: payload
  };
}

module.exports = {
  sendNotification
};