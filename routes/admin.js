var express = require('express');
var router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middleware/authenticateAccessToken');

router.get('/accounts', authenticateToken, adminController.list_approval_account);

module.exports = router;
