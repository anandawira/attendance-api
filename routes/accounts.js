var express = require("express");
var router = express.Router();
const rateLimit = require('express-rate-limit');

const accountsController = require("../controllers/accountsController");
const forgotLimit = rateLimit({ windowMs: 1 * 60 * 60 * 1000, max: 5 });

/* 
[POST] /v1/accounts
1. Register a new account to the system 
2. Forgot password - Send email to create a new password 
*/
router.post("/register", accountsController.register_new_account);
// router.post("/reset-password/:resetToken", accountsController.reset_password);

// router.post(
//     "/forgot-password",
//     forgotLimit,
//     accountsController.send_reset_password_email,
//     );

// [POST] /v1/accounts/auth
// Login to the system, get user information, access_token, and refresh_token
router.post("/auth", accountsController.login);

module.exports = router;
