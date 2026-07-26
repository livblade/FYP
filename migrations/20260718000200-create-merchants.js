// Person 2: Responsible for merchant table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('merchants', {
      merchant_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      business_name: { type: Sequelize.STRING(200), allowNull: false },
      registration_number: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      business_email: { type: Sequelize.STRING(255), allowNull: true },
      business_phone: { type: Sequelize.STRING(50), allowNull: true },
      business_address: { type: Sequelize.TEXT, allowNull: true },
      settlement_currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'SGD' },
      platform_fee_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 1.0 },
      conversion_fee_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0.5 },
      status: { type: Sequelize.ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
      kyc_status: { type: Sequelize.ENUM('PENDING', 'VERIFIED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
      daily_volume_limit: { type: Sequelize.DECIMAL(20, 2), allowNull: false, defaultValue: 100000 },
      monthly_volume_limit: { type: Sequelize.DECIMAL(20, 2), allowNull: false, defaultValue: 1000000 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('merchants', ['business_name']);
    await queryInterface.addIndex('merchants', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('merchants');
  }
};
