// config/sequelize.js
const { Sequelize } = require("sequelize");

// Instanciar sequelize  para conectar a mysql
const sequelize = new Sequelize(
  "LaUveTicketsDDBB", // nombre bd
  "root", // usuario
  "VicenteAdrian6678", // password
  {
    // objeto con opciones de conexion
    host: "va-server.duckdns.org", // Cambia esto por la dirección del servidor MySQL
    port: 3306, // Cambia esto por el puerto del servidor MySql
    dialect: "mysql", // Especificar el dialecto de la base de datos
    // logging: false, // Desactiva el logging de las consultas SQL
    logging: (msg) => {
      if (msg.includes("ERROR")) {
        console.error("Error de Sequelize:", msg);
      }
    },
  }
);

// Probar la conexión
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Conexión exitosa a la base de datos MySQL");
  } catch (error) {
    console.error("Error de conexión:", error);
  }
})();

module.exports = sequelize; // Exportar la instancia de Sequelize para usarla en otros archivos
