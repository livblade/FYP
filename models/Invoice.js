// Person 3: Responsible for invoice lifecycle model and payment intent details.
module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    'Invoice',
    {
      invoice_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      public_id: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      merchant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      customer_email: { type: DataTypes.STRING(255), allowNull: true },
      customer_name: { type: DataTypes.STRING(200), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      amount_sgd: { type: DataTypes.DECIMAL(20, 6), allowNull: false },
      accepted_token: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'ETH' },
      required_crypto_amount: { type: DataTypes.DECIMAL(30, 18), allowNull: true },
      quote_id: { type: DataTypes.STRING(50), allowNull: true },
      contract_invoice_hash: { type: DataTypes.STRING(100), allowNull: true },
      payment_link: { type: DataTypes.STRING(500), allowNull: true },
      status: {
        type: DataTypes.ENUM(
          'DRAFT',
          'AWAITING_PAYMENT',
          'TRANSACTION_SUBMITTED',
          'CONFIRMING',
          'PAID',
          'SETTLEMENT_PENDING',
          'SETTLED',
          'EXPIRED',
          'FAILED',
          'MANUAL_REVIEW'
        ),
        allowNull: false,
        defaultValue: 'DRAFT'
      },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      notification_sent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      payment_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    },
    {
      tableName: 'invoices',
      indexes: [
        { unique: true, fields: ['public_id'] },
        { fields: ['merchant_id'] },
        { fields: ['status'] },
        { fields: ['expires_at'] },
        { fields: ['contract_invoice_hash'] },
        { fields: ['customer_email'] }
      ]
    }
  );

  Invoice.associate = (models) => {
    Invoice.belongsTo(models.Merchant, { foreignKey: 'merchant_id', targetKey: 'merchant_id', as: 'merchant' });
    Invoice.hasMany(models.ExchangeQuote, { foreignKey: 'invoice_id', as: 'exchange_quotes' });
    Invoice.hasMany(models.Payment, { foreignKey: 'invoice_id', as: 'payments' });
  };

  return Invoice;
};