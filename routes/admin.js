var express = require('express');
var router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middleware/authenticateAccessToken');
const attendancesController = require('../controllers/attendancesController');

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

/* 
[GET] /v1/admin/last-attendances
Get list all user last attendances
*/
router.get("/last-attendances", adminController.last_attendances);

/* 
[GET] /v1/admin/absences
Get absences of all users
*/
router.get('/absences', attendancesController.get_all_absences);

module.exports = router;