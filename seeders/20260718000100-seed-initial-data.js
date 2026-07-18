// Person 1: Responsible for base seeding data used by local and QA environments.
'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    await queryInterface.bulkInsert('users', [
      {
        public_id: 'USR-TEST-001',
        email: 'merchant@example.com',
        password_hash: passwordHash,
        full_name: 'Test Merchant',
        role: 'MERCHANT',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('merchants', [
      {
        public_id: 'MCH-TEST-001',
        user_id: 1,
        business_name: 'Test Merchant Pte Ltd',
        business_registration_no: '202600000A',
        status: 'ACTIVE',
        callback_url: 'https://merchant.example.com/webhook',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('invoices', [
      {
        public_id: 'INV-001',
        invoice_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        merchant_id: 1,
        amount_sgd: 100.0,
        amount_eth: 0.02,
        exchange_rate_sgd_eth: 5000,
        status: 'AWAITING_PAYMENT',
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        public_id: 'INV-002',
        invoice_hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        merchant_id: 1,
        amount_sgd: 250.0,
        amount_eth: 0.05,
        exchange_rate_sgd_eth: 5000,
        status: 'PAID',
        paid_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        public_id: 'INV-003',
        invoice_hash: '0x3333333333333333333333333333333333333333333333333333333333333333',
        merchant_id: 1,
        amount_sgd: 300.0,
        amount_eth: 0.06,
        exchange_rate_sgd_eth: 5000,
        status: 'EXPIRED',
        expires_at: new Date(Date.now() - 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('payments', [
      {
        public_id: 'PAY-001',
        invoice_id: 2,
        transaction_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        from_address: '0xaaaa00000000000000000000000000000000aaaa',
        to_address: '0xbbbb00000000000000000000000000000000bbbb',
        amount_eth: 0.05,
        amount_sgd: 250.0,
        block_number: 1000000,
        confirmations: 15,
        status: 'CONFIRMED',
        received_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('settlements', [
      {
        public_id: 'SET-001',
        merchant_id: 1,
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        period_end: new Date(),
        gross_amount_sgd: 250.0,
        platform_fee_sgd: 2.5,
        conversion_fee_sgd: 1.25,
        net_amount_sgd: 246.25,
        status: 'PROCESSING',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('settlements', null, {});
    await queryInterface.bulkDelete('payments', null, {});
    await queryInterface.bulkDelete('invoices', null, {});
    await queryInterface.bulkDelete('merchants', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};