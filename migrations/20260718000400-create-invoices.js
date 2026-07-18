// Person 3: Responsible for invoice table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      public_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      invoice_hash: { type: Sequelize.STRING(66), allowNull: true, unique: true },
      merchant_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount_sgd: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      amount_eth: { type: Sequelize.DECIMAL(36, 18), allowNull: true },
      exchange_rate_sgd_eth: { type: Sequelize.DECIMAL(36, 18), allowNull: true },
      status: {
        type: Sequelize.ENUM('DRAFT', 'AWAITING_PAYMENT', 'TRANSACTION_SUBMITTED', 'CONFIRMING', 'PAID', 'SETTLEMENT_PENDING', 'SETTLED', 'EXPIRED', 'FAILED', 'MANUAL_REVIEW'),
        allowNull: false,
        defaultValue: 'DRAFT'
      },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invoices');
  }
};