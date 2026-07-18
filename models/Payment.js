// Person 3: Responsible for blockchain payment model and transaction tracking.
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    'Payment',
    {
      payment_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      invoice_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      transaction_hash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      log_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      chain_id: { type: DataTypes.INTEGER, allowNull: false },
      payer_wallet: { type: DataTypes.STRING(255), allowNull: false },
      token_address: { type: DataTypes.STRING(255), allowNull: true },
      token_symbol: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ETH' },
      crypto_amount: { type: DataTypes.DECIMAL(30, 18), allowNull: false },
      usd_equivalent: { type: DataTypes.DECIMAL(20, 6), allowNull: true },
      block_number: { type: DataTypes.INTEGER, allowNull: true },
      confirmation_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      required_confirmations: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 12 },
      status: {
        type: DataTypes.ENUM(
          'DETECTED',
          'VERIFYING',
          'CONFIRMING',
          'CONFIRMED',
          'UNDERPAID',
          'OVERPAID',
          'REJECTED',
          'DUPLICATE',
          'FAILED'
        ),
        allowNull: false,
        defaultValue: 'DETECTED'
      },
      detected_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      confirmed_at: { type: DataTypes.DATE, allowNull: true },
      gas_used: { type: DataTypes.BIGINT, allowNull: true },
      gas_price_eth: { type: DataTypes.DECIMAL(30, 18), allowNull: true },
      transaction_fee_eth: { type: DataTypes.DECIMAL(30, 18), allowNull: true },
      failure_reason: { type: DataTypes.TEXT, allowNull: true }
    },
    {
      tableName: 'payments',
      indexes: [
        { unique: true, fields: ['transaction_hash'] },
        { unique: true, fields: ['chain_id', 'transaction_hash', 'log_index'] },
        { fields: ['invoice_id'] },
        { fields: ['status'] },
        { fields: ['payer_wallet'] },
        { fields: ['confirmed_at'] }
      ]
    }
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Invoice, { foreignKey: 'invoice_id', targetKey: 'invoice_id', as: 'invoice' });
    Payment.hasOne(models.Settlement, { foreignKey: 'payment_id', as: 'settlement' });
  };

  return Payment;
};