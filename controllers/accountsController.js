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
    .withMessage('First name must be specified')
    .isAlpha()
    .withMessage('First name has non-alphabetical characters'),
  body('last_name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name must be specified')
    .isAlpha()
    .withMessage('Last name has non-alphabetical characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email invalid')
    .toLowerCase()
    .custom(async (email) => {
      const account = await Account.isEmailExist(email);
      if (account) {
        return Promise.reject('Email already in use');
      }
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be more than 8 character length'),
  
  async(req, res, next) => {
    // Check validation result
    const errors = validationResult(req);
    // Return fail in validation
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      // Hashing password
      const hashedpassword = await bcrypt.hash(req.body.password, 10);

      // New Account
      const account = new Account({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: hashedpassword
      });

      // Save
      const saveAccount = await account.save();

      // Send status success
      res.sendStatus(201);
      // res.status(201).json(saveAccount); //delete later

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
        },
        (error, info) => {
          // Check errors
          if (error) {
            return res.sendStatus(500);
          }
          // Send response
          return res.sendStatus(200);
        },
      );
    } catch (error){
      res.status(400).json({message: error.message});
    }
  }
];

// Forget Password
exports.forget_password = async(req, res) => {
  // Check email
  const account = await Account.isEmailExist(req.body.email);
  if(!account) return res.status(404).json({ message:"Email not found." });
  // console.log(account) //delete later
  try {
    const resetToken = jwt.sign(
      { id: account.id },
      process.env.FORGET_PASSWORD_SECRET,
      { expiresIn: '15m' },
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
      },
      (error, info) => {
        // Check errors
        if (error) {
          return res.sendStatus(500);
        }
        // Send response
        return res.sendStatus(200);
      },
    );
  } catch (error){
    res.status(400).json({message: error.message});
  }
}

exports.login = (req, res) => {
  return res.send("Login");
};
