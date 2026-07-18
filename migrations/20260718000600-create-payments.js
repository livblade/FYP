// Person 3: Responsible for payment table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      public_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      invoice_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'invoices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      transaction_hash: { type: Sequelize.STRING(66), allowNull: false, unique: true },
      from_address: { type: Sequelize.STRING(80), allowNull: false },
      to_address: { type: Sequelize.STRING(80), allowNull: false },
      amount_eth: { type: Sequelize.DECIMAL(36, 18), allowNull: false },
      amount_sgd: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      block_number: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      confirmations: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('DETECTED', 'VERIFYING', 'CONFIRMING', 'CONFIRMED', 'UNDERPAID', 'OVERPAID', 'REJECTED', 'DUPLICATE', 'FAILED'),
        allowNull: false,
        defaultValue: 'DETECTED'
      },
      received_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  }
};