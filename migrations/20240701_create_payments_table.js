'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const hasPayments = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.TABLE_NAME)).includes('payments');
    if (hasPayments) {
      return;
    }

    await queryInterface.createTable('payments', {
      payment_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'invoices',
          key: 'invoice_id'
        },
        onDelete: 'CASCADE'
      },
      transaction_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      log_index: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      chain_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      payer_wallet: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      token_address: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      token_symbol: {
        type: Sequelize.STRING(20),
        defaultValue: 'ETH'
      },
      crypto_amount: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: false
      },
      usd_equivalent: {
        type: Sequelize.DECIMAL(20, 6),
        allowNull: true
      },
      block_number: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      confirmation_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      required_confirmations: {
        type: Sequelize.INTEGER,
        defaultValue: 12
      },
      status: {
        type: Sequelize.ENUM('DETECTED', 'VERIFYING', 'CONFIRMING', 'CONFIRMED', 'UNDERPAID', 'OVERPAID', 'REJECTED', 'DUPLICATE', 'FAILED'),
        defaultValue: 'DETECTED'
      },
      detected_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      gas_used: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      gas_price_eth: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: true
      },
      transaction_fee_eth: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: true
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('payments', ['transaction_hash'], { name: 'idx_transaction_hash' });
    await queryInterface.addIndex('payments', ['invoice_id'], { name: 'idx_invoice' });
    await queryInterface.addIndex('payments', ['status'], { name: 'idx_status' });
    await queryInterface.addIndex('payments', ['payer_wallet'], { name: 'idx_payer' });
    await queryInterface.addIndex('payments', ['confirmed_at'], { name: 'idx_confirmed' });
    await queryInterface.addConstraint('payments', {
      fields: ['chain_id', 'transaction_hash', 'log_index'],
      type: 'unique',
      name: 'unique_blockchain_event'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  }
};
