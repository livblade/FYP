// Person 4: Responsible for settlement table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('settlements', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      public_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      merchant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      period_start: { type: Sequelize.DATE, allowNull: false },
      period_end: { type: Sequelize.DATE, allowNull: false },
      gross_amount_sgd: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      platform_fee_sgd: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      conversion_fee_sgd: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      net_amount_sgd: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('CREATED', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW'), allowNull: false, defaultValue: 'CREATED' },
      settled_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('settlements');
  }
};