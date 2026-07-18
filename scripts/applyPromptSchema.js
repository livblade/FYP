require('dotenv').config();
const { sequelize } = require('../config/database');

const DROP_TABLES_SQL = [
  'DROP TABLE IF EXISTS audit_logs',
  'DROP TABLE IF EXISTS webhook_events',
  'DROP TABLE IF EXISTS settlements',
  'DROP TABLE IF EXISTS payments',
  'DROP TABLE IF EXISTS exchange_quotes',
  'DROP TABLE IF EXISTS invoices',
  'DROP TABLE IF EXISTS merchant_wallets',
  'DROP TABLE IF EXISTS bank_accounts',
  'DROP TABLE IF EXISTS merchant_cash_reconciliation',
  'DROP TABLE IF EXISTS merchants',
  'DROP TABLE IF EXISTS users'
];

const CREATE_TABLES_SQL = [
  `CREATE TABLE users (
      user_id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('ADMIN', 'MERCHANT') DEFAULT 'MERCHANT',
      status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
      email_verified BOOLEAN DEFAULT FALSE,
      last_login DATETIME,
      profile_picture VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE merchants (
      merchant_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT UNIQUE NOT NULL,
      business_name VARCHAR(200) NOT NULL,
      registration_number VARCHAR(100) UNIQUE,
      business_email VARCHAR(255),
      business_phone VARCHAR(50),
      business_address TEXT,
      settlement_currency VARCHAR(10) DEFAULT 'SGD',
      platform_fee_percentage DECIMAL(5,2) DEFAULT 1.00,
      conversion_fee_percentage DECIMAL(5,2) DEFAULT 0.50,
      status ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED') DEFAULT 'PENDING',
      kyc_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
      daily_volume_limit DECIMAL(20,2) DEFAULT 100000,
      monthly_volume_limit DECIMAL(20,2) DEFAULT 1000000,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_business_name (business_name),
      INDEX idx_status (status),
      INDEX idx_registration (registration_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE merchant_wallets (
      wallet_id INT PRIMARY KEY AUTO_INCREMENT,
      merchant_id INT NOT NULL,
      wallet_address VARCHAR(255) NOT NULL,
      network VARCHAR(50) DEFAULT 'SEPOLIA',
      wallet_type ENUM('ETH', 'USDC', 'USDT') DEFAULT 'ETH',
      is_active BOOLEAN DEFAULT TRUE,
      is_default BOOLEAN DEFAULT FALSE,
      label VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE,
      UNIQUE KEY unique_wallet (wallet_address, network, wallet_type),
      INDEX idx_merchant (merchant_id),
      INDEX idx_address (wallet_address)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE invoices (
      invoice_id INT PRIMARY KEY AUTO_INCREMENT,
      public_id VARCHAR(20) UNIQUE NOT NULL,
      merchant_id INT NOT NULL,
      customer_email VARCHAR(255),
      customer_name VARCHAR(200),
      description TEXT,
      amount_sgd DECIMAL(20,6) NOT NULL,
      accepted_token VARCHAR(50) DEFAULT 'ETH',
      required_crypto_amount DECIMAL(30,18),
      quote_id VARCHAR(50),
      contract_invoice_hash VARCHAR(100),
      payment_link VARCHAR(500),
      expires_at DATETIME NOT NULL,
      status ENUM('DRAFT', 'AWAITING_PAYMENT', 'TRANSACTION_SUBMITTED', 'CONFIRMING', 'PAID', 'SETTLEMENT_PENDING', 'SETTLED', 'EXPIRED', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'DRAFT',
      notification_sent BOOLEAN DEFAULT FALSE,
      payment_attempts INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE,
      INDEX idx_public_id (public_id),
      INDEX idx_merchant (merchant_id),
      INDEX idx_status (status),
      INDEX idx_expires (expires_at),
      INDEX idx_contract_hash (contract_invoice_hash),
      INDEX idx_customer_email (customer_email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE exchange_quotes (
      quote_id INT PRIMARY KEY AUTO_INCREMENT,
      invoice_id INT NOT NULL,
      source VARCHAR(100) DEFAULT 'COINGECKO',
      base_asset VARCHAR(20) DEFAULT 'ETH',
      quote_currency VARCHAR(10) DEFAULT 'SGD',
      exchange_rate DECIMAL(30,18) NOT NULL,
      crypto_amount DECIMAL(30,18) NOT NULL,
      buffer_percentage DECIMAL(5,2) DEFAULT 2.00,
      expiry_minutes INT DEFAULT 15,
      raw_response JSON,
      is_used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
      INDEX idx_invoice (invoice_id),
      INDEX idx_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE payments (
      payment_id INT PRIMARY KEY AUTO_INCREMENT,
      invoice_id INT NOT NULL,
      transaction_hash VARCHAR(255) UNIQUE NOT NULL,
      log_index INT DEFAULT 0,
      chain_id INT NOT NULL,
      payer_wallet VARCHAR(255) NOT NULL,
      token_address VARCHAR(255),
      token_symbol VARCHAR(20) DEFAULT 'ETH',
      crypto_amount DECIMAL(30,18) NOT NULL,
      usd_equivalent DECIMAL(20,6),
      block_number INT,
      confirmation_count INT DEFAULT 0,
      required_confirmations INT DEFAULT 12,
      status ENUM('DETECTED', 'VERIFYING', 'CONFIRMING', 'CONFIRMED', 'UNDERPAID', 'OVERPAID', 'REJECTED', 'DUPLICATE', 'FAILED') DEFAULT 'DETECTED',
      detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      confirmed_at DATETIME,
      gas_used BIGINT,
      gas_price_eth DECIMAL(30,18),
      transaction_fee_eth DECIMAL(30,18),
      failure_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
      UNIQUE KEY unique_blockchain_event (chain_id, transaction_hash, log_index),
      INDEX idx_transaction_hash (transaction_hash),
      INDEX idx_invoice (invoice_id),
      INDEX idx_status (status),
      INDEX idx_payer (payer_wallet),
      INDEX idx_confirmed (confirmed_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE settlements (
      settlement_id INT PRIMARY KEY AUTO_INCREMENT,
      merchant_id INT NOT NULL,
      payment_id INT UNIQUE NOT NULL,
      gross_amount_sgd DECIMAL(20,6) NOT NULL,
      platform_fee_sgd DECIMAL(20,6) NOT NULL,
      conversion_fee_sgd DECIMAL(20,6) DEFAULT 0,
      net_amount_sgd DECIMAL(20,6) NOT NULL,
      settlement_reference VARCHAR(50) UNIQUE NOT NULL,
      provider_reference VARCHAR(100),
      payout_address VARCHAR(255),
      status ENUM('CREATED', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW') DEFAULT 'CREATED',
      failure_reason TEXT,
      settled_at DATETIME,
      completed_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE,
      FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
      INDEX idx_merchant (merchant_id),
      INDEX idx_payment (payment_id),
      INDEX idx_status (status),
      INDEX idx_reference (settlement_reference),
      INDEX idx_settled (settled_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE webhook_events (
      webhook_event_id INT PRIMARY KEY AUTO_INCREMENT,
      provider VARCHAR(50) NOT NULL,
      external_event_id VARCHAR(255),
      payload_hash VARCHAR(100) UNIQUE NOT NULL,
      raw_payload JSON NOT NULL,
      processing_status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DUPLICATE') DEFAULT 'PENDING',
      processed_at DATETIME,
      failure_reason TEXT,
      retry_count INT DEFAULT 0,
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_provider (provider),
      INDEX idx_status (processing_status),
      INDEX idx_external (external_event_id),
      INDEX idx_payload (payload_hash)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE audit_logs (
      audit_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100),
      old_values JSON,
      new_values JSON,
      ip_address VARCHAR(45),
      user_agent TEXT,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_action (action),
      INDEX idx_entity (entity_type, entity_id),
      INDEX idx_created (created_at),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

async function applyPromptSchema() {
  try {
    console.log('Applying prompt-defined schema...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const statement of DROP_TABLES_SQL) {
      await sequelize.query(statement);
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    for (const statement of CREATE_TABLES_SQL) {
      await sequelize.query(statement);
    }

    console.log('Schema applied successfully.');
  } catch (error) {
    console.error('Failed to apply prompt schema:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

applyPromptSchema();
