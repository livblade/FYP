// Person 4: Responsible for webhook event model and external event idempotency tracking.
module.exports = (sequelize, DataTypes) => {
  const WebhookEvent = sequelize.define(
    'WebhookEvent',
    {
      webhook_event_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      provider: { type: DataTypes.STRING(50), allowNull: false },
      external_event_id: { type: DataTypes.STRING(255), allowNull: true },
      payload_hash: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      raw_payload: { type: DataTypes.JSON, allowNull: false },
      processing_status: { type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DUPLICATE'), allowNull: false, defaultValue: 'PENDING' },
      processed_at: { type: DataTypes.DATE, allowNull: true },
      failure_reason: { type: DataTypes.TEXT, allowNull: true },
      retry_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      received_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    {
      tableName: 'webhook_events',
      indexes: [
        { fields: ['provider'], name: 'idx_provider' },
        { fields: ['processing_status'], name: 'idx_status' },
        { fields: ['external_event_id'], name: 'idx_external' },
        { fields: ['payload_hash'], name: 'idx_payload' }
      ]
    }
  );

  WebhookEvent.associate = () => {};

  return WebhookEvent;
};