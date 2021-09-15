const express = require('express');
const router = express.Router();

const attendancesController = require('../controllers/attendancesController');
const authenticateAccessToken = require('../middleware/authenticateAccessToken');

router.use(authenticateAccessToken);

/* 
[GET] /v1/attendances
Get attendances of all users
*/
router.get('/', attendancesController.get_attendances_of_all_users);

/* 
[GET] /v1/attendances/{userId}
Get attendances by user id
*/
router.get('/:userId', attendancesController.get_attendances_by_user_id);
module.exports = router;
