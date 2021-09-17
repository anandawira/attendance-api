var express = require('express');
var router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middleware/authenticateAccessToken');

router.use(authenticateToken);

/* 
[GET] /v1/admin
Get list account for approval
*/
router.get("/", adminController.list_approval_account);

/* 
[PUT] /v1/admin/{accountId}
Update account approval
*/
router.put("/:id?", adminController.update_approval);

module.exports = router;
