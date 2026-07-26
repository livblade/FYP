// Person 2: Responsible for merchant wallet table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('merchant_wallets', {
      wallet_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      merchant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'merchants', key: 'merchant_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      wallet_address: { type: Sequelize.STRING(255), allowNull: false },
      network: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'SEPOLIA' },
      wallet_type: { type: Sequelize.ENUM('ETH', 'USDC', 'USDT'), allowNull: false, defaultValue: 'ETH' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      label: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('merchant_wallets', ['merchant_id']);
    await queryInterface.addIndex('merchant_wallets', ['wallet_address']);
    await queryInterface.addIndex('merchant_wallets', ['wallet_address', 'network', 'wallet_type'], {
      unique: true,
      name: 'merchant_wallets_wallet_network_type_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('merchant_wallets');
  }
};
