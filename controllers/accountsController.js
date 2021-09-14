const Account = require('../models/account');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register_new_account = (req, res) => {
  return res.send('Register new account');
};

exports.login = [
  body('email')
    .exists()
    .withMessage(`'email' is not found in the request body`)
    .bail()
    .trim()
    .isEmail()
    .withMessage('Email invalid')
    .bail()
    .toLowerCase(),
  body('password')
    .exists()
    .withMessage(`'password' is not found in the request body`),
  async (req, res, next) => {
    // Check validation result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Request body did not pass the validation process',
        errors: errors.array(),
      });
    }

    try {
      // Get account from database
      const account = await Account.findOne(
        { email: req.body.email },
        'first_name last_name isAdmin password status'
      ).lean();

      // Check if account with user's email exist
      if (!account) {
        // If not found, send response to client
        return res.status(401).json({ message: 'Email is not registered' });
      }

      // Destructure query result to variables
      const {
        _id,
        first_name,
        last_name,
        isAdmin,
        password: hashedPassword,
        status,
      } = account;

      // Compare user's plain password to the password hash in database
      const isPasswordMatch = await bcrypt.compare(
        req.body.password,
        hashedPassword
      );

      // Check comparison result
      if (!isPasswordMatch) {
        // If password did not match hashed password in database, send response to client
        return res.status(401).json({ message: 'Incorrect password' });
      }

      // Check if account has been approved by admin.
      if (status !== 'approved') {
        // If status is not approved, send response to client
        return res.status(403).json({
          message: 'This user has not been approved by admin',
          status: status,
        });
      }

      // Generate access token
      const accessToken = jwt.sign(
        { id: _id, isAdmin: isAdmin },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1d' }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        { id: _id, isAdmin: isAdmin },
        process.env.REFRESH_TOKEN_SECRET
      );

      // Send response to client
      return res.status(200).json({
        message: 'User authenticated successfully',
        data: {
          id: _id,
          first_name: first_name,
          last_name: last_name,
          isAdmin: isAdmin,
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      });
    } catch (err) {
      // If error, pass error to error handler.
      next(err);
    }
  },
];
