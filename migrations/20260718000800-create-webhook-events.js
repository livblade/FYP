// Person 4: Responsible for webhook event table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('webhook_events', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      provider: { type: Sequelize.STRING(64), allowNull: false },
      event_id: { type: Sequelize.STRING(128), allowNull: false },
      event_type: { type: Sequelize.STRING(128), allowNull: false },
      payload: { type: Sequelize.JSON, allowNull: false },
      processed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addConstraint('webhook_events', {
      fields: ['provider', 'event_id'],
      type: 'unique',
      name: 'uq_webhook_events_provider_event_id'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('webhook_events');
  }
};