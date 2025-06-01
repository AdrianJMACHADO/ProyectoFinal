const Respuesta = require("../utils/respuesta.js");
const { logMensaje } = require("../utils/logger.js");
const initModels = require("../models/init-models.js").initModels;
const sequelize = require("../config/sequelize.js");

const models = initModels(sequelize);
const Feria = models.feria;

class FeriaController {
  async createFeria(req, res) {
    const feria = req.body;
    try {
      const nuevoFeria = await Feria.create(feria);
      res.status(201).json(Respuesta.exito(nuevoFeria, "Feria registrado"));
    } catch (err) {
      logMensaje("Error:", err.name || "Nombre no definido");
      res
        .status(500)
        .json(Respuesta.error(null, `Error al registrar feria: ${feria}`));
    }
  }

  async getAllFeria(req, res) {
    try {
      const data = await Feria.findAll();
      res.json(Respuesta.exito(data, "Lista de feria recuperada"));
    } catch (err) {
      res
        .status(500)
        .json(Respuesta.error(null, `Error al obtener feria: ${req.originalUrl}`));
    }
  }
  async getTipoById(req, res) {
    const { idferia } = req.params;
    try {
      const feria = await Feria.findByPk(idferia);
      if (!feria) {
        res.status(404).json(Respuesta.error(null, `Feria no encontrado: ${idferia}`));
      } else {
        res.json(Respuesta.exito(feria, "Feria encontrado"));
      }
    } catch (err) {
      res.status(500).json(Respuesta.error(null, `Error al obtener feria: ${idferia}`));
    }
  }

  async updateFeria(req, res) {
    const { idferia } = req.params;
    const datosActualizados = req.body;
    try {
      const feria = await Feria.findByPk(idferia);
      if (!feria) {
        res.status(404).json(Respuesta.error(null, `Feria no encontrado: ${idferia}`));
      } else {
        await feria.update(datosActualizados);
        res.json(Respuesta.exito(feria, "Feria actualizado"));
      }
    } catch (err) {
      res.status(500).json(Respuesta.error(null, `Error al actualizar feria: ${idferia}`));
    }
  }

  // async deleteFeria(req, res) {
  //   const { idferia } = req.params;
  //   try {
  //     const feria = await Feria.findByPk(idferia);
  //     if (!feria) {
  //       res.status(404).json(Respuesta.error(null, `Feria no encontrado: ${idferia}`));
  //     } else {
  //       await feria.destroy();
  //       res.json(Respuesta.exito(null, "Feria eliminado"));
  //     }
  //   } catch (err) {
  //     res.status(500).json(Respuesta.error(null, `Error al eliminar feria: ${idferia}`));
  //   }
  // }
}

module.exports = new FeriaController();
