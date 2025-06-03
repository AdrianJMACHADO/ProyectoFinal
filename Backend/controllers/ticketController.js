const Respuesta = require("../utils/respuesta.js");
const { logMensaje } = require("../utils/logger.js");
const initModels = require("../models/init-models.js").initModels;
const sequelize = require("../config/sequelize.js");

const models = initModels(sequelize);
const Ticket = models.ticket;

class TicketController {
  async createTicket(req, res) {
    const ticket = req.body;
    try {
      const nuevaTicket = await Ticket.create(ticket);
      res.status(201).json(Respuesta.exito(nuevaTicket, "Ticket registrada"));
    } catch (err) {
      logMensaje("Error:", err.name || "Nombre no definido");
      res
        .status(500)
        .json(Respuesta.error(null, `Error al registrar ticket: ${ticket}`));
    }
  }

  async getAllTicket(req, res) {
    try {
      const data = await Ticket.findAll({
        order: [['fecha_creacion', 'DESC']]
      });
      res.json(Respuesta.exito(data, "Lista de ticket recuperada"));
    } catch (err) {
      res
        .status(500)
        .json(Respuesta.error(null, `Error al obtener ticket: ${req.originalUrl}`));
    }
  }
  async getTicketById(req, res) {
    const { idticket } = req.params;
    try {
      const ticket = await Ticket.findByPk(idticket);
      if (!ticket) {
        res.status(404).json(Respuesta.error(null, `Ticket no encontrada: ${idticket}`));
      } else {
        res.json(Respuesta.exito(ticket, "Ticket encontrada"));
      }
    } catch (err) {
      res.status(500).json(Respuesta.error(null, `Error al obtener ticket: ${idticket}`));
    }
  }

  async updateTicket(req, res) {
    const { idticket } = req.params;
    const datosActualizados = req.body;
    try {
      const ticket = await Ticket.findByPk(idticket);
      if (!ticket) {
        res.status(404).json(Respuesta.error(null, `Ticket no encontrada: ${idticket}`));
      } else {
        await ticket.update(datosActualizados);
        res.json(Respuesta.exito(ticket, "Ticket actualizada"));
      }
    } catch (err) {
      res.status(500).json(Respuesta.error(null, `Error al actualizar ticket: ${idticket}`));
    }
  }

  // async deleteTicket(req, res) {
  //   const { idticket } = req.params;
  //   try {
  //     const ticket = await Ticket.findByPk(idticket);
  //     if (!ticket) {
  //       res.status(404).json(Respuesta.error(null, `Ticket no encontrada: ${idticket}`));
  //     } else {
  //       await ticket.destroy();
  //       res.json(Respuesta.exito(null, "Ticket eliminada"));
  //     }
  //   } catch (err) {
  //     res.status(500).json(Respuesta.error(null, `Error al eliminar ticket: ${idticket}`));
  //   }
  // }
}

module.exports = new TicketController();
