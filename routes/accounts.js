var express = require("express");
var router = express.Router();
const rateLimit = require('express-rate-limit');

const accountsController = require("../controllers/accountsController");
const forgetLimit = rateLimit({ windowMs: 1 * 60 * 60 * 1000, max: 5 });


// [POST] /v1/accounts/register
// Register a new account to the system 
router.post("/register", accountsController.register_new_account);

// [POST] /v1/accounts/forget-password
// Forget password - User will receive email to reset password page
router.post(
    "/forget-password",
    forgetLimit,
    accountsController.forget_password,
    );

// [POST] /v1/accounts/reset-password
// Reset user's password with token from server 
router.post("/reset-password/:resetToken", accountsController.reset_password);

// [POST] /v1/accounts/auth
// Login to the system, get user information, access_token, and refresh_token
router.post("/auth", accountsController.login);

module.exports = router;
