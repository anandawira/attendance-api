const Attendance = require('../models/attendance');
const { DateTime } = require('luxon');
const { query, validationResult } = require('express-validator');

// TODO: filter by period
exports.get_all_attendances = [
  query('year')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage(`query parameter 'year' invalid.`),
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage(
      `query parameter 'month' is invalid. please only use number 1 to 12.`
    ),
  async (req, res, next) => {
    // Check if user is admin
    if (!req.account.isAdmin) {
      return res
        .status(403)
        .json({ message: `This user don't have admin privilege` });
    }

    // Check validation result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message:
          'Request query parameters did not pass the validation process.',
        errors: errors.array(),
      });
    }

    // Create current date object
    const now = DateTime.now().setZone('Asia/Jakarta');

    // Get year and month from query parameters with default current year and month
    const year = parseInt(req.query.year ?? now.year);
    const month = parseInt(req.query.month ?? now.month);

    // Generating startDate and endDate for mongoDB querying
    const startDate = DateTime.fromObject({ year: year, month: month }).setZone(
      'Asia/Jakarta'
    );
    const endDate = DateTime.fromObject(
      month !== 12
        ? { year: year, month: month + 1 }
        : { year: year + 1, month: 1 }
    ).setZone('Asia/Jakarta');

    try {
      // Retrieve all attendances in period
      const attendances = await Attendance.find({
        out_time: { $exists: true },
        in_time: { $gte: startDate, $lt: endDate },
      }).lean({ virtuals: true });

      // Send response to user
      return res.json(attendances);
    } catch (err) {
      // Pass error to error handler
      return next(err);
    }
  },
];
