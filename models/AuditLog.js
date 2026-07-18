// Person 4: Responsible for audit trail model and compliance-grade event logging.
module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      audit_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      action: { type: DataTypes.STRING(100), allowNull: false },
      entity_type: { type: DataTypes.STRING(50), allowNull: false },
      entity_id: { type: DataTypes.STRING(100), allowNull: true },
      old_values: { type: DataTypes.JSON, allowNull: true },
      new_values: { type: DataTypes.JSON, allowNull: true },
      ip_address: { type: DataTypes.STRING(45), allowNull: true },
      user_agent: { type: DataTypes.TEXT, allowNull: true },
      metadata: { type: DataTypes.JSON, allowNull: true }
    },
    {
      tableName: 'audit_logs',
      timestamps: false,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [{ fields: ['user_id'] }, { fields: ['action'] }, { fields: ['entity_type', 'entity_id'] }, { fields: ['created_at'] }]
    }
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });
  };

  return AuditLog;
};