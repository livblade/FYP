'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Superseded by 20260718000600-create-payments.js, which runs after invoices exist.
    return undefined;
  },

  async down(queryInterface) {
    return undefined;
  }
};
