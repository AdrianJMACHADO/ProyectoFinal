// Importar librería express --> web server
const express = require("express");
// Importar librería path, para manejar rutas de ficheros en el servidor
const path = require("path");
// Importar librería CORS
const cors = require("cors");
// Importar gestores de rutas
const feriaRoutes = require("./routes/feriaRoutes");
const ticketRoutes = require("./routes/ticketRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Lista de orígenes permitidos (web local y producción)
const allowedOrigins = [
  'http://localhost:3000',             // Desarrollo web local
  'http://va-server.duckdns.org',      // Web en producción (ajusta si usas HTTPS)
];

// Configurar middleware para analizar JSON en las solicitudes
app.use(express.json());

// Configurar CORS de forma segura
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Permitir peticiones sin origin (apps móviles) o permitidas
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

// Configurar rutas de la API REST
app.use("/api/feria", feriaRoutes);
app.use("/api/ticket", ticketRoutes);

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
