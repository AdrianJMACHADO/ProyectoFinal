const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ticket', {
    idTicket: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    idFeria: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'feria',
        key: 'idFeria'
      }
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    cantidad_inicial: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    usos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "ACTIVO"
    }
  }, {
    sequelize,
    tableName: 'ticket',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "idTicket" },
        ]
      },
      {
        name: "idFeria",
        using: "BTREE",
        fields: [
          { name: "idFeria" },
        ]
      },
    ]
  });
};
