// Person 2: Responsible for merchant table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('merchants', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      public_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      business_name: { type: Sequelize.STRING(180), allowNull: false },
      business_registration_no: { type: Sequelize.STRING(80), allowNull: true },
      status: { type: Sequelize.ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
      callback_url: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('merchants');
  }
};