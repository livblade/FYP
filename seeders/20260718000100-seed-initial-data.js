// Person 1: Responsible for base seeding data used by local and QA environments.
'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    await queryInterface.bulkInsert('users', [
      {
        user_id: 1,
        name: 'Test Merchant',
        email: 'merchant@example.com',
        password_hash: passwordHash,
        role: 'MERCHANT',
        status: 'ACTIVE',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('merchants', [
      {
        merchant_id: 1,
        user_id: 1,
        business_name: 'Test Merchant Pte Ltd',
        registration_number: '202600000A',
        business_email: 'merchant@example.com',
        business_phone: '+65 6000 0000',
        business_address: '1 Test Street, Singapore',
        settlement_currency: 'SGD',
        platform_fee_percentage: 1.0,
        conversion_fee_percentage: 0.5,
        status: 'ACTIVE',
        kyc_status: 'VERIFIED',
        daily_volume_limit: 100000,
        monthly_volume_limit: 1000000,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('merchant_wallets', [
      {
        wallet_id: 1,
        merchant_id: 1,
        wallet_address: '0xbbbb00000000000000000000000000000000bbbb',
        network: 'SEPOLIA',
        wallet_type: 'ETH',
        is_active: true,
        is_default: true,
        label: 'Default Sepolia ETH payout',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('invoices', [
      {
        public_id: 'INV-001',
        merchant_id: 1,
        customer_email: 'customer1@example.com',
        customer_name: 'Customer One',
        description: 'Seed invoice awaiting payment',
        amount_sgd: 100.0,
        accepted_token: 'ETH',
        required_crypto_amount: 0.02,
        contract_invoice_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        status: 'AWAITING_PAYMENT',
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
        notification_sent: false,
        payment_attempts: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        public_id: 'INV-002',
        merchant_id: 1,
        customer_email: 'customer2@example.com',
        customer_name: 'Customer Two',
        description: 'Seed invoice paid',
        amount_sgd: 250.0,
        accepted_token: 'ETH',
        required_crypto_amount: 0.05,
        contract_invoice_hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        status: 'PAID',
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
        notification_sent: true,
        payment_attempts: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        public_id: 'INV-003',
        merchant_id: 1,
        customer_email: 'customer3@example.com',
        customer_name: 'Customer Three',
        description: 'Seed invoice expired',
        amount_sgd: 300.0,
        accepted_token: 'ETH',
        required_crypto_amount: 0.06,
        contract_invoice_hash: '0x3333333333333333333333333333333333333333333333333333333333333333',
        status: 'EXPIRED',
        expires_at: new Date(Date.now() - 60 * 60 * 1000),
        notification_sent: false,
        payment_attempts: 0,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('payments', [
      {
        payment_id: 1,
        invoice_id: 2,
        transaction_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        log_index: 0,
        chain_id: 11155111,
        payer_wallet: '0xaaaa00000000000000000000000000000000aaaa',
        token_address: null,
        token_symbol: 'ETH',
        crypto_amount: 0.05,
        block_number: 1000000,
        confirmation_count: 15,
        required_confirmations: 12,
        status: 'CONFIRMED',
        detected_at: new Date(),
        confirmed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('settlements', [
      {
        settlement_id: 1,
        merchant_id: 1,
        payment_id: 1,
        gross_amount_sgd: 250.0,
        platform_fee_sgd: 2.5,
        conversion_fee_sgd: 1.25,
        net_amount_sgd: 246.25,
        settlement_reference: 'SET-001',
        payout_address: '0xbbbb00000000000000000000000000000000bbbb',
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
    await queryInterface.bulkDelete('merchant_wallets', null, {});
    await queryInterface.bulkDelete('merchants', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
