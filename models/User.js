// Person 1: Responsible for user account model and authentication-related fields.
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      user_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      role: { type: DataTypes.ENUM('ADMIN', 'MERCHANT'), allowNull: false, defaultValue: 'MERCHANT' },
      status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'), allowNull: false, defaultValue: 'ACTIVE' },
      email_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      last_login: { type: DataTypes.DATE, allowNull: true },
      profile_picture: { type: DataTypes.STRING(500), allowNull: true }
    },
    {
      tableName: 'users',
      indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['status'] }
      ]
    }
  );

  User.associate = (models) => {
    User.hasOne(models.Merchant, { foreignKey: 'user_id', as: 'merchant_profile' });
    User.hasMany(models.AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
  };

  return User;
};