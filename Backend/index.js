// Importar librería express --> web server
const express = require("express");
// Importar librería path, para manejar rutas de ficheros en el servidor
const path = require("path");
// Importar libreria CORS
const cors = require("cors");
// Importar gestores de rutas
const feriaRoutes = require("./routes/feriaRoutes");
const ticketRoutes = require("./routes/ticketRoutes");


const app = express();
const port = process.env.PORT || 3000;

// Configurar middleware para analizar JSON en las solicitudes
app.use(express.json());
// Configurar CORS para admitir cualquier origen
app.use(cors(
  {
    origin: "http://localhost:8081",
    credentials: true,
  }
));

// Configurar rutas de la API Rest
app.use("/api/feria", feriaRoutes);
app.use("/api/ticket", ticketRoutes);

// // Configurar el middleware para servir archivos estáticos desde el directorio 'public\old_js_vainilla'
// app.use(express.static(path.join(__dirname, "public","old_js_vainilla")));

// Ruta para manejar las solicitudes al archivo index.html
// app.get('/', (req, res) => {
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "old_js_vainilla","index.html"));
// });

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
