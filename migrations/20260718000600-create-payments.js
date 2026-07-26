// Person 3: Responsible for payment table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      payment_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      invoice_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'invoices', key: 'invoice_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      transaction_hash: { type: Sequelize.STRING(255), allowNull: false },
      log_index: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      chain_id: { type: Sequelize.INTEGER, allowNull: false },
      payer_wallet: { type: Sequelize.STRING(255), allowNull: false },
      token_address: { type: Sequelize.STRING(255), allowNull: true },
      token_symbol: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ETH' },
      crypto_amount: { type: Sequelize.DECIMAL(30, 18), allowNull: false },
      usd_equivalent: { type: Sequelize.DECIMAL(20, 6), allowNull: true },
      block_number: { type: Sequelize.INTEGER, allowNull: true },
      confirmation_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      required_confirmations: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 12 },
      status: {
        type: Sequelize.ENUM('DETECTED', 'VERIFYING', 'CONFIRMING', 'CONFIRMED', 'UNDERPAID', 'OVERPAID', 'REJECTED', 'DUPLICATE', 'FAILED'),
        allowNull: false,
        defaultValue: 'DETECTED'
      },
      detected_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      confirmed_at: { type: Sequelize.DATE, allowNull: true },
      gas_used: { type: Sequelize.BIGINT, allowNull: true },
      gas_price_eth: { type: Sequelize.DECIMAL(30, 18), allowNull: true },
      transaction_fee_eth: { type: Sequelize.DECIMAL(30, 18), allowNull: true },
      failure_reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('payments', ['transaction_hash'], {
      unique: true,
      name: 'idx_transaction_hash_unique'
    });
    await queryInterface.addIndex('payments', ['chain_id', 'transaction_hash', 'log_index'], {
      unique: true,
      name: 'unique_blockchain_event'
    });
    await queryInterface.addIndex('payments', ['invoice_id'], { name: 'idx_invoice' });
    await queryInterface.addIndex('payments', ['status'], { name: 'idx_status' });
    await queryInterface.addIndex('payments', ['payer_wallet'], { name: 'idx_payer' });
    await queryInterface.addIndex('payments', ['confirmed_at'], { name: 'idx_confirmed' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  }
};
