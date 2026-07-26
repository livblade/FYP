// Person 3: Responsible for invoice table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoices', {
      invoice_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      public_id: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      merchant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'merchants', key: 'merchant_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      customer_email: { type: Sequelize.STRING(255), allowNull: true },
      customer_name: { type: Sequelize.STRING(200), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      amount_sgd: { type: Sequelize.DECIMAL(20, 6), allowNull: false },
      accepted_token: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'ETH' },
      required_crypto_amount: { type: Sequelize.DECIMAL(30, 18), allowNull: true },
      quote_id: { type: Sequelize.STRING(50), allowNull: true },
      contract_invoice_hash: { type: Sequelize.STRING(100), allowNull: true },
      payment_link: { type: Sequelize.STRING(500), allowNull: true },
      status: {
        type: Sequelize.ENUM('DRAFT', 'AWAITING_PAYMENT', 'TRANSACTION_SUBMITTED', 'CONFIRMING', 'PAID', 'SETTLEMENT_PENDING', 'SETTLED', 'EXPIRED', 'FAILED', 'MANUAL_REVIEW'),
        allowNull: false,
        defaultValue: 'DRAFT'
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      notification_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      payment_attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('invoices', ['merchant_id']);
    await queryInterface.addIndex('invoices', ['status']);
    await queryInterface.addIndex('invoices', ['expires_at']);
    await queryInterface.addIndex('invoices', ['contract_invoice_hash']);
    await queryInterface.addIndex('invoices', ['customer_email']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invoices');
  }
};
