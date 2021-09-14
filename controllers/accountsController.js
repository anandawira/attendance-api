const Account = require('../models/account');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

exports.register_new_account = [
  // Validate and sanitize fields.
  body('first_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name must be specified.')
    .isAlpha()
    .withMessage('First name has non-alphabetical characters.'),
  body('last_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name must be specified.')
    .isAlpha()
    .withMessage('Last name has non-alphabetical characters.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email invalid.')
    .toLowerCase()
    .custom(async (email) => {
      const account = await Account.isEmailExist(email);
      if (account) {
        return Promise.reject('Email already in use.');
      }
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be more than 8 character length.'),

  (req, res, next) => {
    // Check validation result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Hash user's password using bcrypt
    bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
      // Check if hashing failed
      if (err) {
        return res.status(500).send('Password hashing failed.');
      }

      // Create new User object from request body and hashed password
      const account = new Account({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: hashedPassword,
      });

      account.save((err) => {
        // Check if database query failed and put error message to response
        if (err) {
          return next(err);
        }
        // Send response 'Created' on success
        return res.sendStatus(201);
      });

      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'glintsipe1@gmail.com', // generated ethereal user
          pass: process.env.GMAIL_PASSWORD, // generated ethereal password
        },
      });

      // send mail to admin
      transporter.sendMail(
        {
          from: '"Attendance App Glints-IPE1" <glintsipe1@gmail.com>', // sender address
          to: 'zidni.imani@gmail.com', // list of receivers
          subject: 'Account Register Approval', // Subject line
          html: `<p>Hello admin,</p>
          <p>
            An account has just registered and needs your approval to continue log in.
            Please check your dashboard page and make sure to approve the right employee's email.
            <a href="https://attendance.app/dashboard">Click here to check it now.</a>
          </p>
          <p></p>
          <p>Attendance App - Glints IPE 1</p>
          `, // html body
        },
        (err, info) => {
          // Check errors
          if (err) {
            return next(err);
          }
          // Send response
          return res.sendStatus(200);
        },
      );
    });
  },
];

exports.login = (req, res) => {
  return res.send("Login");
};
