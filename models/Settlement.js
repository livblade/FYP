// Person 4: Responsible for settlement model and reconciliation state management.
module.exports = (sequelize, DataTypes) => {
  const Settlement = sequelize.define(
    'Settlement',
    {
      settlement_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      merchant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      payment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
      gross_amount_sgd: { type: DataTypes.DECIMAL(20, 6), allowNull: false },
      platform_fee_sgd: { type: DataTypes.DECIMAL(20, 6), allowNull: false },
      conversion_fee_sgd: { type: DataTypes.DECIMAL(20, 6), allowNull: false, defaultValue: 0 },
      net_amount_sgd: { type: DataTypes.DECIMAL(20, 6), allowNull: false },
      settlement_reference: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      provider_reference: { type: DataTypes.STRING(100), allowNull: true },
      payout_address: { type: DataTypes.STRING(255), allowNull: true },
      status: { type: DataTypes.ENUM('CREATED', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW'), allowNull: false, defaultValue: 'CREATED' },
      failure_reason: { type: DataTypes.TEXT, allowNull: true },
      settled_at: { type: DataTypes.DATE, allowNull: true },
      completed_at: { type: DataTypes.DATE, allowNull: true }
    },
    {
      tableName: 'settlements',
      indexes: [{ fields: ['merchant_id'] }, { fields: ['payment_id'] }, { fields: ['status'] }, { fields: ['settlement_reference'] }, { fields: ['settled_at'] }]
    }
  );

  Settlement.associate = (models) => {
    Settlement.belongsTo(models.Merchant, { foreignKey: 'merchant_id', targetKey: 'merchant_id', as: 'merchant' });
    Settlement.belongsTo(models.Payment, { foreignKey: 'payment_id', targetKey: 'payment_id', as: 'payment' });
  };

  return Settlement;
};