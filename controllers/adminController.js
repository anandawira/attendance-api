const Account = require('../models/account');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// Get list account for approval
exports.list_approval_account = async (req, res, next) => {
  // Check if account have admin access
  if (!req.account.isAdmin) {
    return res.status(403).json({ message: "This user doesn't have admin role" });
  }
  try {
      // Get account list
      const results = await Account.aggregate([
        {
          "$match": { isAdmin: false }
        },
        {
          "$project": {
            first_name: 1,
            last_name: 1,
            email: 1,
            _id: 1,
            status:1,
            createdAt:{
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
          }
        }
      ]);
      // send response
      return res.status(200).json({
        message: 'Account list retrieved successfully.',
        results,
      });
  } catch (error) {
      next(error);
  }
};


// Update account approval
exports.update_approval = [
  // Validating status value
  body('status')
    .exists()
    .withMessage(`'status' is not found in the request body`)
    .bail()
    .isIn(['approved','rejected'])
    .withMessage(`'status' value should be 'approved' or 'rejected'.`),
  body('message')
    .optional(),
  async (req, res, next) => {
    // Check if account have admin access
    if (!req.account.isAdmin) {
      return res.status(403).json({ message: "This user doesn't have admin role" });
    }

    // Check new approval status
    const errors = validationResult(req);
    // Return bad request if status not match
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Request body did not pass the validation process.',
      errors: errors.array(),
      });
    }
    try {
      // Check if account id is valid
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid object Id' });
      }
      // Check if account id not found
      const account = await Account.findById(req.params.id);
      if (!account) return res.status(404).json({ message:"Account not found." });

      // Update approval
      await Account.findByIdAndUpdate({_id:req.params.id}, { status: req.body.status });

      // Get admin message
      const notes = req.body.message || "-";

      // Send message to user email
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
          to: account.email, // list of receivers
          subject: 'Account Approval Updates', // Subject line
          html: `<p>Hi ${account.first_name},</p>
          <p>Your account approval have been changed with the following status:</p>
          <p>Status: ${req.body.status}</p>
          <p>Note: ${notes}</p>
          <p>Contact us if you think this update is wrong.</p>
          <p></p>
          <p><a href="https://${req.hostname}/">Attendance App - Glints IPE 1</a></p>
          `, // html body
        }
      );
      
      // Send status OK
      return res.status(200).json({
          message: 'Account approval updated successfully.',
          status: req.body.status,
        });

    } catch (error) {
        next(error);
    }
  }
]

// Get list all user last attendances
exports.last_attendances = async (req, res, next) => {
  // Check if account have admin access
  if (!req.account.isAdmin) {
    return res.status(403).json({ message: "This user doesn't have admin role" });
  }
  try {
      // Get account list
      const results = await Account.aggregate([
        {
          "$lookup": {
            from: 'attendances',
            localField: '_id',
            foreignField: 'account',
            as: 'attendances'
           }
        },
        {
          "$unwind": '$attendances'
        },
        {
          '$group': {
            _id: '$_id',
            first_name: {'$first': '$first_name'},
            last_name: {'$first': '$last_name'},
            last_check_in: { '$max': '$attendances.in_time'},
            last_check_out: { '$max': '$attendances.out_time'},
          }
        },
      ]);
      // send response
      return res.status(200).json({
        message: 'All account last attendances retrieved successfully.',
        results,
      });
  } catch (error) {
      next(error);
  }
};