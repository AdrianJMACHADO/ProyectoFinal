const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ticket', {
    idticket: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    idferia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'feria',
        key: 'idferia'
      }
    },
    pelicula: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    hora: {
      type: DataTypes.TIME,
      allowNull: false
    },
    precio: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: false
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
          { name: "idticket" },
        ]
      },
      {
        name: "idferia",
        using: "BTREE",
        fields: [
          { name: "idferia" },
        ]
      },
    ]
  });
};
