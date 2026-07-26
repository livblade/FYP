// Person 1: Responsible for user table migration.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      user_id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM('ADMIN', 'MERCHANT'), allowNull: false, defaultValue: 'MERCHANT' },
      status: { type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'), allowNull: false, defaultValue: 'ACTIVE' },
      email_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      last_login: { type: Sequelize.DATE, allowNull: true },
      profile_picture: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('users', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
