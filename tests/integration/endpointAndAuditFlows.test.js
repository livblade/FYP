require('dotenv').config();

const { expect } = require('chai');
const express = require('express');
const path = require('path');
const request = require('supertest');
const { DataTypes, Op } = require('sequelize');

const dashboardRoutes = require('../../routes/dashboardRoutes');
const settlementRoutes = require('../../routes/settlementRoutes');
const paymentRoutes = require('../../routes/paymentRoutes');
const auditRoutes = require('../../routes/auditRoutes');
const { sequelize, connectDatabase } = require('../../config/database');
const defineUser = require('../../models/User');
const defineMerchant = require('../../models/Merchant');
const defineInvoice = require('../../models/Invoice');
const definePayment = require('../../models/Payment');
const defineSettlement = require('../../models/Settlement');
const defineAuditLog = require('../../models/AuditLog');
const paymentVerificationService = require('../../services/paymentVerificationService');

const User = defineUser(sequelize, DataTypes);
const Merchant = defineMerchant(sequelize, DataTypes);
const Invoice = defineInvoice(sequelize, DataTypes);
const Payment = definePayment(sequelize, DataTypes);
const Settlement = defineSettlement(sequelize, DataTypes);
const AuditLog = defineAuditLog(sequelize, DataTypes);

let sessionUser = null;

function createTestApp() {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', '..', 'views'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    req.session = { user: sessionUser };
    next();
  });

  app.use('/dashboard', dashboardRoutes);
  app.use('/settlements', settlementRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/audits', auditRoutes);

  app.use((error, req, res, next) => {
    return res.status(500).json({ success: false, message: error.message });
  });

  return app;
}

function randomId(prefix) {
  const rand = Math.random().toString(16).slice(2, 8);
  return `${prefix}${Date.now()}${rand}`;
}

function txHash(seed) {
  const clean = String(seed).replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  return `0x${clean.padEnd(64, 'a').slice(0, 64)}`;
}

describe('Integration: Dashboard and Settlement APIs + Audit Flows', () => {
  const app = createTestApp();
  const scope = {
    user: null,
    merchant: null,
    invoices: [],
    payments: [],
    settlements: []
  };

  before(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    const suffix = randomId('u');
    const user = await User.create({
      name: `Integration Merchant ${suffix}`,
      email: `integration-${suffix}@example.com`,
      password_hash: 'hashed-test-password',
      role: 'MERCHANT',
      status: 'ACTIVE',
      email_verified: true
    });

    const merchant = await Merchant.create({
      user_id: user.user_id,
      business_name: `Biz ${suffix}`,
      registration_number: `REG-${suffix}`,
      business_email: `biz-${suffix}@example.com`,
      status: 'ACTIVE',
      kyc_status: 'VERIFIED'
    });

    const invoiceA = await Invoice.create({
      public_id: randomId('INV-A').slice(0, 20),
      merchant_id: merchant.merchant_id,
      amount_sgd: 100,
      accepted_token: 'ETH',
      required_crypto_amount: '0.010000000000000000',
      status: 'AWAITING_PAYMENT',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const invoiceB = await Invoice.create({
      public_id: randomId('INV-B').slice(0, 20),
      merchant_id: merchant.merchant_id,
      amount_sgd: 150,
      accepted_token: 'ETH',
      required_crypto_amount: '0.020000000000000000',
      status: 'AWAITING_PAYMENT',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const confirmedPayment = await Payment.create({
      invoice_id: invoiceA.invoice_id,
      transaction_hash: txHash(randomId('p1')),
      log_index: 0,
      chain_id: 11155111,
      payer_wallet: '0x1111111111111111111111111111111111111111',
      token_address: null,
      token_symbol: 'ETH',
      crypto_amount: '0.010000000000000000',
      confirmation_count: 5,
      required_confirmations: 3,
      status: 'CONFIRMED'
    });

    const detectedPayment = await Payment.create({
      invoice_id: invoiceB.invoice_id,
      transaction_hash: txHash(randomId('p2')),
      log_index: 0,
      chain_id: 11155111,
      payer_wallet: '0x2222222222222222222222222222222222222222',
      token_address: null,
      token_symbol: 'ETH',
      crypto_amount: '0.020000000000000000',
      confirmation_count: 0,
      required_confirmations: 3,
      status: 'DETECTED'
    });

    const settlement = await Settlement.create({
      merchant_id: merchant.merchant_id,
      payment_id: confirmedPayment.payment_id,
      gross_amount_sgd: 100,
      platform_fee_sgd: 1,
      conversion_fee_sgd: 0.5,
      net_amount_sgd: 98.5,
      settlement_reference: `SIM-SGD-${randomId('s').slice(-10)}`,
      status: 'CREATED',
      settled_at: new Date()
    });

    sessionUser = {
      user_id: user.user_id,
      role: 'MERCHANT',
      email: user.email
    };

    scope.user = user;
    scope.merchant = merchant;
    scope.invoices = [invoiceA, invoiceB];
    scope.payments = [confirmedPayment, detectedPayment];
    scope.settlements = [settlement];
  });

  afterEach(async () => {
    const paymentIds = scope.payments.map((entry) => entry.payment_id);
    const settlementIds = scope.settlements.map((entry) => entry.settlement_id);
    const invoiceIds = scope.invoices.map((entry) => entry.invoice_id);

    if (scope.user) {
      await AuditLog.destroy({
        where: {
          [Op.or]: [
            { user_id: scope.user.user_id },
            {
              action: {
                [Op.in]: [
                  'PAYMENT_VERIFICATION_UPDATED',
                  'PAYMENT_SUBMITTED',
                  'SETTLEMENT_CREATED',
                  'SETTLEMENT_STATUS_UPDATED'
                ]
              },
              entity_id: { [Op.in]: [...paymentIds.map((id) => String(id)), ...settlementIds.map((id) => String(id))] }
            }
          ]
        }
      });
    }

    if (scope.merchant) {
      await Settlement.destroy({ where: { merchant_id: scope.merchant.merchant_id } });
      if (invoiceIds.length) {
        await Payment.destroy({ where: { invoice_id: invoiceIds } });
      }
      await Invoice.destroy({ where: { merchant_id: scope.merchant.merchant_id } });
      await Merchant.destroy({ where: { merchant_id: scope.merchant.merchant_id } });
    }

    if (scope.user) {
      await User.destroy({ where: { user_id: scope.user.user_id } });
    }

    sessionUser = null;
    scope.user = null;
    scope.merchant = null;
    scope.invoices = [];
    scope.payments = [];
    scope.settlements = [];
  });

  it('GET /dashboard/payment-history returns merchant payments with status filter', async () => {
    const response = await request(app).get('/dashboard/payment-history?status=confirmed');

    expect(response.status).to.equal(200);
    expect(response.body.success).to.equal(true);
    expect(Array.isArray(response.body.data)).to.equal(true);
    expect(response.body.data.length).to.equal(1);
    expect(response.body.data[0].status).to.equal('CONFIRMED');
  });

  it('GET /dashboard/settlement-history returns merchant settlements with status filter', async () => {
    const response = await request(app).get('/dashboard/settlement-history?status=created');

    expect(response.status).to.equal(200);
    expect(response.body.success).to.equal(true);
    expect(Array.isArray(response.body.data)).to.equal(true);
    expect(response.body.data.length).to.equal(1);
    expect(response.body.data[0].status).to.equal('CREATED');
  });

  it('GET /settlements/api returns merchant settlement list', async () => {
    const response = await request(app).get('/settlements/api');

    expect(response.status).to.equal(200);
    expect(response.body.success).to.equal(true);
    expect(Array.isArray(response.body.data)).to.equal(true);
    expect(response.body.data.length).to.equal(1);
  });

  it('GET /settlements/api/:publicId returns settlement detail', async () => {
    const target = scope.settlements[0];
    const response = await request(app).get(`/settlements/api/${target.settlement_reference}`);

    expect(response.status).to.equal(200);
    expect(response.body.success).to.equal(true);
    expect(response.body.data.settlement_reference).to.equal(target.settlement_reference);
  });

  it('GET /settlements/api/reconcile returns a settlement summary', async () => {
    const response = await request(app).get('/settlements/api/reconcile');

    expect(response.status).to.equal(200);
    expect(response.body.success).to.equal(true);
    expect(response.body.data).to.have.property('summary');
    expect(response.body.data.summary).to.have.property('total', 1);
    expect(Array.isArray(response.body.data.settlements)).to.equal(true);
  });

  it('GET /audits returns the audit log review page for admins', async () => {
    const adminUser = await User.create({
      name: `Admin ${randomId('a')}`,
      email: `admin-${randomId('a')}@example.com`,
      password_hash: 'hashed-test-password',
      role: 'ADMIN',
      status: 'ACTIVE',
      email_verified: true
    });

    await AuditLog.create({
      user_id: adminUser.user_id,
      action: 'SETTLEMENT_CREATED',
      entity_type: 'settlement',
      entity_id: String(scope.settlements[0].settlement_id),
      metadata: { source: 'integration-test' }
    });

    sessionUser = {
      user_id: adminUser.user_id,
      role: 'ADMIN',
      email: adminUser.email
    };

    const response = await request(app).get('/audits');

    expect(response.status).to.equal(200);
    expect(response.text).to.include('Audit Logs');
    expect(response.text).to.include('SETTLEMENT_CREATED');

    await AuditLog.destroy({ where: { user_id: adminUser.user_id } });
    await User.destroy({ where: { user_id: adminUser.user_id } });
    sessionUser = {
      user_id: scope.user.user_id,
      role: 'MERCHANT',
      email: scope.user.email
    };
  });

  it('allows admins to list and update settlements without a merchant profile', async () => {
    const adminUser = await User.create({
      name: `Admin ${randomId('a')}`,
      email: `admin-${randomId('a')}@example.com`,
      password_hash: 'hashed-test-password',
      role: 'ADMIN',
      status: 'ACTIVE',
      email_verified: true
    });

    sessionUser = {
      user_id: adminUser.user_id,
      role: 'ADMIN',
      email: adminUser.email
    };

    const listResponse = await request(app).get('/settlements/api');

    expect(listResponse.status).to.equal(200);
    expect(listResponse.body.success).to.equal(true);
    expect(Array.isArray(listResponse.body.data)).to.equal(true);
    expect(listResponse.body.data.some((entry) => entry.settlement_id === scope.settlements[0].settlement_id)).to.equal(true);

    const updateResponse = await request(app)
      .post(`/settlements/${scope.settlements[0].settlement_reference}/status`)
      .set('Accept', 'application/json')
      .send({ status: 'manual_review', failure_reason: 'Admin review required' });

    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body.success).to.equal(true);
    expect(updateResponse.body.data.status).to.equal('MANUAL_REVIEW');
    expect(updateResponse.body.data.failure_reason).to.equal('Admin review required');

    const audit = await AuditLog.findOne({
      where: {
        user_id: adminUser.user_id,
        action: 'SETTLEMENT_STATUS_UPDATED',
        entity_type: 'settlement',
        entity_id: String(scope.settlements[0].settlement_id)
      },
      order: [['audit_id', 'DESC']]
    });

    expect(audit).to.not.equal(null);

    await AuditLog.destroy({ where: { user_id: adminUser.user_id } });
    await User.destroy({ where: { user_id: adminUser.user_id } });
    sessionUser = {
      user_id: scope.user.user_id,
      role: 'MERCHANT',
      email: scope.user.email
    };
  });

  it('POST /api/payments/submit writes PAYMENT_SUBMITTED audit log', async () => {
    const invoice = await Invoice.create({
      public_id: randomId('INV-C').slice(0, 20),
      merchant_id: scope.merchant.merchant_id,
      amount_sgd: 200,
      accepted_token: 'ETH',
      required_crypto_amount: '0.030000000000000000',
      status: 'AWAITING_PAYMENT',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    scope.invoices.push(invoice);

    const submitHash = txHash(randomId('submit'));
    const response = await request(app).post('/api/payments/submit').send({
      invoice_public_id: invoice.public_id,
      transaction_hash: submitHash,
      wallet_address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      chain_id: 11155111
    });

    expect(response.status).to.equal(201);
    expect(response.body.success).to.equal(true);

    const audit = await AuditLog.findOne({
      where: {
        action: 'PAYMENT_SUBMITTED',
        entity_type: 'payment',
        entity_id: String(response.body.data.payment_id)
      }
    });

    expect(audit).to.not.equal(null);

    const createdPayment = await Payment.findByPk(response.body.data.payment_id);
    if (createdPayment) {
      scope.payments.push(createdPayment);
    }
  });

  it('POST /settlements writes SETTLEMENT_CREATED audit log', async () => {
    const invoice = await Invoice.create({
      public_id: randomId('INV-D').slice(0, 20),
      merchant_id: scope.merchant.merchant_id,
      amount_sgd: 80,
      accepted_token: 'ETH',
      required_crypto_amount: '0.009000000000000000',
      status: 'PAID',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    scope.invoices.push(invoice);

    const payment = await Payment.create({
      invoice_id: invoice.invoice_id,
      transaction_hash: txHash(randomId('p3')),
      log_index: 0,
      chain_id: 11155111,
      payer_wallet: '0x3333333333333333333333333333333333333333',
      token_address: null,
      token_symbol: 'ETH',
      crypto_amount: '0.009000000000000000',
      confirmation_count: 5,
      required_confirmations: 3,
      status: 'CONFIRMED'
    });
    scope.payments.push(payment);

    const response = await request(app)
      .post('/settlements')
      .set('Accept', 'application/json')
      .send({ payment_id: payment.payment_id });

    expect(response.status).to.equal(201);
    expect(response.body.success).to.equal(true);

    const createdSettlementId = response.body.data.settlement_id;
    const createdSettlement = await Settlement.findByPk(createdSettlementId);
    if (createdSettlement) {
      scope.settlements.push(createdSettlement);
    }

    const audit = await AuditLog.findOne({
      where: {
        action: 'SETTLEMENT_CREATED',
        entity_type: 'settlement',
        entity_id: String(createdSettlementId)
      }
    });

    expect(audit).to.not.equal(null);
  });

  it('POST /settlements/:publicId/status writes SETTLEMENT_STATUS_UPDATED audit log', async () => {
    const settlement = scope.settlements[0];
    const response = await request(app)
      .post(`/settlements/${settlement.settlement_reference}/status`)
      .send({ status: 'completed' });

    expect(response.status).to.equal(200);
    expect(response.body.success).to.equal(true);
    expect(response.body.data.status).to.equal('COMPLETED');

    const audit = await AuditLog.findOne({
      where: {
        action: 'SETTLEMENT_STATUS_UPDATED',
        entity_type: 'settlement',
        entity_id: String(settlement.settlement_id)
      },
      order: [['audit_id', 'DESC']]
    });

    expect(audit).to.not.equal(null);
  });

  it('auto creates settlement when payment reaches required confirmations', async () => {
    const targetPayment = scope.payments[1];
    const targetInvoice = scope.invoices[1];

    const updatedPayment = await paymentVerificationService.updatePaymentConfirmations(targetPayment.payment_id, 3);

    expect(updatedPayment.status).to.equal('CONFIRMED');

    const settlement = await Settlement.findOne({ where: { payment_id: targetPayment.payment_id } });
    expect(settlement).to.not.equal(null);
    scope.settlements.push(settlement);

    const reloadedInvoice = await Invoice.findByPk(targetInvoice.invoice_id);
    expect(reloadedInvoice.status).to.equal('SETTLED');

    const audit = await AuditLog.findOne({
      where: {
        action: 'SETTLEMENT_CREATED',
        entity_type: 'settlement',
        entity_id: String(settlement.settlement_id)
      },
      order: [['audit_id', 'DESC']]
    });

    expect(audit).to.not.equal(null);
    expect(audit.metadata.source).to.equal('auto-settlement');
  });

  it('Payment verification confirmation update writes PAYMENT_VERIFICATION_UPDATED audit log', async () => {
    const targetPayment = scope.payments[1];

    await paymentVerificationService.saveVerifiedPayment(
      targetPayment,
      {
        invoiceId: targetPayment.invoice_id,
        transactionHash: targetPayment.transaction_hash,
        eventData: {
          logIndex: targetPayment.log_index,
          token: '0x0000000000000000000000000000000000000000'
        },
        payerWallet: targetPayment.payer_wallet,
        cryptoAmount: BigInt('20000000000000000'),
        blockNumber: 123456,
        confirmations: 3,
        receipt: {
          gasUsed: BigInt(21000),
          gasPrice: BigInt(1000000000)
        }
      },
      'CONFIRMED'
    );

    const audit = await AuditLog.findOne({
      where: {
        action: 'PAYMENT_VERIFICATION_UPDATED',
        entity_type: 'payment',
        entity_id: String(targetPayment.payment_id)
      },
      order: [['audit_id', 'DESC']]
    });

    expect(audit).to.not.equal(null);
    expect(audit.metadata.target_status).to.equal('CONFIRMED');
  });
});
