// Person 2: Responsible for merchant onboarding model and operational status.
module.exports = (sequelize, DataTypes) => {
  const Merchant = sequelize.define(
    'Merchant',
    {
      merchant_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
      business_name: { type: DataTypes.STRING(200), allowNull: false },
      registration_number: { type: DataTypes.STRING(100), allowNull: true, unique: true },
      business_email: { type: DataTypes.STRING(255), allowNull: true },
      business_phone: { type: DataTypes.STRING(50), allowNull: true },
      business_address: { type: DataTypes.TEXT, allowNull: true },
      settlement_currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SGD' },
      platform_fee_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 1.0 },
      conversion_fee_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.5 },
      status: { type: DataTypes.ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
      kyc_status: { type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
      daily_volume_limit: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 100000 },
      monthly_volume_limit: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 1000000 }
    },
    {
      tableName: 'merchants',
      indexes: [{ fields: ['business_name'] }, { fields: ['status'] }, { fields: ['registration_number'] }]
    }
  );

  Merchant.associate = (models) => {
    Merchant.belongsTo(models.User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });
    Merchant.hasMany(models.MerchantWallet, { foreignKey: 'merchant_id', as: 'wallets' });
    Merchant.hasMany(models.Invoice, { foreignKey: 'merchant_id', as: 'invoices' });
    Merchant.hasMany(models.Settlement, { foreignKey: 'merchant_id', as: 'settlements' });
  };

  return Merchant;
};