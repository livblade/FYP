// Person 3: Responsible for FX quote model and quote locking metadata.
module.exports = (sequelize, DataTypes) => {
  const ExchangeQuote = sequelize.define(
    'ExchangeQuote',
    {
      quote_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      invoice_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      source: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'COINGECKO' },
      base_asset: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ETH' },
      quote_currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SGD' },
      exchange_rate: { type: DataTypes.DECIMAL(30, 18), allowNull: false },
      crypto_amount: { type: DataTypes.DECIMAL(30, 18), allowNull: false },
      buffer_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 2.0 },
      expiry_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 15 },
      raw_response: { type: DataTypes.JSON, allowNull: true },
      is_used: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    {
      tableName: 'exchange_quotes',
      indexes: [{ fields: ['invoice_id'] }, { fields: ['created_at'] }]
    }
  );

  ExchangeQuote.associate = (models) => {
    ExchangeQuote.belongsTo(models.Invoice, { foreignKey: 'invoice_id', targetKey: 'invoice_id', as: 'invoice' });
  };

  return ExchangeQuote;
};