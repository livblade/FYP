// Person 3: Responsible for exchange quote table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exchange_quotes', {
      quote_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      invoice_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'invoices', key: 'invoice_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      source: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'COINGECKO' },
      base_asset: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ETH' },
      quote_currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'SGD' },
      exchange_rate: { type: Sequelize.DECIMAL(30, 18), allowNull: false },
      crypto_amount: { type: Sequelize.DECIMAL(30, 18), allowNull: false },
      buffer_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 2.0 },
      expiry_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 15 },
      raw_response: { type: Sequelize.JSON, allowNull: true },
      is_used: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('exchange_quotes', ['invoice_id']);
    await queryInterface.addIndex('exchange_quotes', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exchange_quotes');
  }
};
