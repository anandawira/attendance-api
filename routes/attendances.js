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

/* 
[GET] /v1/attendances/{userId}/status
Get user's today attendance status
*/
router.get(
  '/:userId/status',
  attendancesController.get_user_today_attendance_status
);

/* 
[POST] /v1/attendances/{userId}/in
Check in attendance of current user
*/
router.post(
  '/:userId/in',
  attendancesController.check_in_attendance_by_user_id
);

/* 
[POST] /v1/attendances/{userId}/out
Check out attendance of current user
*/
router.post(
  '/:userId/out',
  attendancesController.check_out_attendance_by_user_id
);

module.exports = router;