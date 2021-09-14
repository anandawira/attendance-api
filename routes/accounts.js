const express = require('express');
const router = express.Router();

const accountsController = require('../controllers/accountsController');

/* 
[POST] /v1/accounts
Register a new account to the system 
*/
router.post('/', accountsController.register_new_account);

// [POST] /v1/accounts/auth
// Login to the system, get user information, access_token, and refresh_token
router.post('/auth', accountsController.login);

module.exports = router;
