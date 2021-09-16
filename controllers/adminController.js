const Account = require('../models/account');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.list_approval_account = async (req, res) => {
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

exports.update_approval = [
  // Validating status value
  body('status')
    .isIn(['pending','approved','rejected'])
    .withMessage("Invalid approval status."),
  async (req, res, next) => {
    // Check if account have admin access
    if (!req.account.isAdmin) {
      return res.status(403).json({ message: "This user doesn't have admin role" });
    }

    // Check new approval status
    const errors = validationResult(req);
    // Return bad request if status not match
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid approval status.' });
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