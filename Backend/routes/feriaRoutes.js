// feriaRoutes.js
const express = require('express');
const router = express.Router();
const feriaController = require('../controllers/feriaController');

router.get('/', feriaController.getAllFeria);
router.post('/', feriaController.createFeria);
router.get('/:idferia', feriaController.getTipoById);
router.put('/:idferia', feriaController.updateFeria);
router.delete('/:idferia', feriaController.deleteFeria);

module.exports = router;
