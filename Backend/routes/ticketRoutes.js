// ticketRoutes.js
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

router.get('/', ticketController.getAllTicket);
router.post('/', ticketController.createTicket);
router.get('/:idticket', ticketController.getTicketById);
router.put('/:idticket', ticketController.updateTicket);
router.delete('/:idticket', ticketController.deleteTicket);

module.exports = router;
