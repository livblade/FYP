// Person 4: Responsible for webhook event table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const hasWebhookEvents = tables
      .map((tableName) => (typeof tableName === 'string' ? tableName : tableName.tableName || tableName.TABLE_NAME))
      .includes('webhook_events');

    if (hasWebhookEvents) {
      return;
    }

    await queryInterface.createTable('webhook_events', {
      webhook_event_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      provider: { type: Sequelize.STRING(50), allowNull: false },
      external_event_id: { type: Sequelize.STRING(255), allowNull: true },
      payload_hash: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      raw_payload: { type: Sequelize.JSON, allowNull: false },
      processing_status: {
        type: Sequelize.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DUPLICATE'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      failure_reason: { type: Sequelize.TEXT, allowNull: true },
      retry_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      received_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('webhook_events', ['provider'], { name: 'idx_provider' });
    await queryInterface.addIndex('webhook_events', ['processing_status'], { name: 'idx_status' });
    await queryInterface.addIndex('webhook_events', ['external_event_id'], { name: 'idx_external' });
    await queryInterface.addIndex('webhook_events', ['payload_hash'], { name: 'idx_payload' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('webhook_events');
  }
};