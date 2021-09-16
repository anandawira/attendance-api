var express = require('express');
var router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middleware/authenticateAccessToken');

router.use(authenticateToken);

router.get("/", adminController.list_approval_account);

router.put("/:id?", adminController.update_approval);

module.exports = router;
