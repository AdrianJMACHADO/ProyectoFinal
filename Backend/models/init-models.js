var DataTypes = require("sequelize").DataTypes;
var _feria = require("./feria");
var _ticket = require("./ticket");

function initModels(sequelize) {
  var feria = _feria(sequelize, DataTypes);
  var ticket = _ticket(sequelize, DataTypes);

  ticket.belongsTo(feria, { as: "idFeria_ferium", foreignKey: "idFeria"});
  feria.hasMany(ticket, { as: "tickets", foreignKey: "idFeria"});

  return {
    feria,
    ticket,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
