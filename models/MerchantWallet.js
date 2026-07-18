// Person 2: Responsible for merchant wallet model and address ownership mapping.
module.exports = (sequelize, DataTypes) => {
  const MerchantWallet = sequelize.define(
    'MerchantWallet',
    {
      wallet_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      merchant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      wallet_address: { type: DataTypes.STRING(255), allowNull: false },
      network: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'SEPOLIA' },
      wallet_type: { type: DataTypes.ENUM('ETH', 'USDC', 'USDT'), allowNull: false, defaultValue: 'ETH' },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      label: { type: DataTypes.STRING(100), allowNull: true }
    },
    {
      tableName: 'merchant_wallets',
      indexes: [{ fields: ['merchant_id'] }, { fields: ['wallet_address'] }, { unique: true, fields: ['wallet_address', 'network', 'wallet_type'] }]
    }
  );

  MerchantWallet.associate = (models) => {
    MerchantWallet.belongsTo(models.Merchant, { foreignKey: 'merchant_id', as: 'merchant' });
  };

  return MerchantWallet;
};