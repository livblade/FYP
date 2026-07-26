// Person 4: Responsible for settlement table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('settlements', {
      settlement_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      merchant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'merchants', key: 'merchant_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      payment_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
        references: { model: 'payments', key: 'payment_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      gross_amount_sgd: { type: Sequelize.DECIMAL(20, 6), allowNull: false },
      platform_fee_sgd: { type: Sequelize.DECIMAL(20, 6), allowNull: false },
      conversion_fee_sgd: { type: Sequelize.DECIMAL(20, 6), allowNull: false, defaultValue: 0 },
      net_amount_sgd: { type: Sequelize.DECIMAL(20, 6), allowNull: false },
      settlement_reference: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      provider_reference: { type: Sequelize.STRING(100), allowNull: true },
      payout_address: { type: Sequelize.STRING(255), allowNull: true },
      status: { type: Sequelize.ENUM('CREATED', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW'), allowNull: false, defaultValue: 'CREATED' },
      failure_reason: { type: Sequelize.TEXT, allowNull: true },
      settled_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('settlements', ['merchant_id']);
    await queryInterface.addIndex('settlements', ['status']);
    await queryInterface.addIndex('settlements', ['settled_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('settlements');
  }
};
