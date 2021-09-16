const express = require('express');
const router = express.Router();

const attendancesController = require('../controllers/attendancesController');
const authenticateAccessToken = require('../middleware/authenticateAccessToken');

router.use(authenticateAccessToken);

/* 
[GET] /v1/attendances
Get all attendances
*/
router.get('/', attendancesController.get_all_attendances);

module.exports = router;
