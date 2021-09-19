const Account = require('../models/account');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Register
exports.register_new_account = [
  // Validating and sanitizing
  body('first_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name must be specified.'),
  body('last_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name must be specified.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email invalid')
    .bail()
    .toLowerCase()
    .custom(async (email) => {
      const isEmailExist = await Account.exists({ email: email });
      if (!isEmailExist) {
        throw new Error();
      }
    })
    .withMessage('Email already in use'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be more than 8 character length'),

  async (req, res, next) => {
    // Check validation result
    const errors = validationResult(req);
    // Return fail in validation
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Request body did not pass the validation process.',
        errors: errors.array() });
    }
    try {
      // Hashing password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      // New Account
      const account = new Account({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: hashedPassword,
      });

      // Send email to Admin 
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'glintsipe1@gmail.com', // generated ethereal user
          pass: process.env.GMAIL_PASSWORD, // generated ethereal password
        },
      });
      transporter.sendMail(
        {
          from: '"Attendance App Glints-IPE1" <glintsipe1@gmail.com>', // sender address
          to: 'zidni.imani@gmail.com', // list of receivers change/delete later
          subject: 'Account Register Approval', // Subject line
          html: `<p>Hello Admin,</p>
          <p>An account has just registered and needs your approval to login.</p>
          <p>Please check your dashboard page and make sure to approve the right employee's email.</p>
          <p><a href="https://attendance.app/dashboard">Click here to check it now.</a></p>
          <p></p>
          <p>Attendance App - Glints IPE 1</p>
          `,
        }
      );

      // Save
      const saveAccount = await account.save();

      // Send status success
      return res.status(201).json({message:"Account register success."});

    } catch (error){
      next(error);
    }
  },
];

// Forget Password
exports.forget_password = async (req, res) => {
  // Check email
  const account = await Account.findOne({ email: email });
  if (!account) return res.status(404).json({ message: 'Email not found.' });
  // console.log(account) //delete later
  try {
    const resetToken = jwt.sign(
      { id: account.id },
      process.env.FORGET_PASSWORD_SECRET,
      { expiresIn: '15m' }
    );

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'glintsipe1@gmail.com', // generated ethereal user
        pass: process.env.GMAIL_PASSWORD, // generated ethereal password
      },
    });

    // send mail with defined transport object
    transporter.sendMail(
      {
        from: '"Attendance App Glints-IPE1" <glintsipe1@gmail.com>', // sender address
        to: req.body.email, // list of receivers
        subject: 'Password Reset', // Subject line
        html: `<p>Hey ${account.first_name}!</p>
        <p>Looks like you forgot your password. We cannot simply send you your old password.</p>
        <p>A unique link to reset your password has been generated for you. To
        reset your password, click the following link and follow the instructions.</p>
        <p><a href="https://${req.hostname}/reset-password/?token=${resetToken}">Click here to reset your password</a>. This link will expire in 15 minutes.</p>
        <p></p>
        <p>Attendance App - Glints IPE 1</p>
        `, // html body
      }
    );
    // console.log(resetToken); //delete later
    return res.status(200).json({message: "Operation success. Email sent to the user."});
  } catch (error){
    next(error);
  }
};

// Reset password
exports.reset_password = [
  // Validate password
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be more than 8 character length'),

  async (req, res, next) => {
    try {
      // Check validation result
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: 'Password must be more than 8 character length' });
      }
      
      // Verify token
      jwt.verify(
        req.params.resetToken,
        process.env.FORGET_PASSWORD_SECRET,
        (error, account) => {
          // Check errors
          if (error) {
            return res
              .status(403)
              .json({ message: 'Reset token is incorrect' });
          }
          // Add account to request object
          req.account = account;
        }
      );

      // Hashing password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      // Update password
      Account.findByIdAndChangePassword(req.account.id, hashedPassword);

      // Send status success
      return res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
      // Send error message
      next(error);
    };
  }
];

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
        message: 'Request body did not pass the validation process.',
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
        return res.status(401).json({ message: 'Email is not registered.' });
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
        return res.status(401).json({ message: 'Incorrect password.' });
      }

      // Check if account has been approved by admin.
      if (status !== 'approved') {
        // If status is not approved, send response to client
        return res.status(403).json({
          message: 'This user has not been approved by admin.',
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
        { id: _id },
        process.env.REFRESH_TOKEN_SECRET
      );

      // Send response to client
      return res.status(200).json({
        message: 'User authentication success',
        data: {
          id: _id,
          first_name,
          last_name,
          isAdmin,
          office_location: {
            lat: -6.175,
            long: 106.8286,
          },
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
