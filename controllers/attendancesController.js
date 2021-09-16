const Attendance = require('../models/attendance');
const Account = require('../models/account');
const { DateTime } = require('luxon');
const { query, param, validationResult, body } = require('express-validator');
const { getDistance } = require('geolib');
const { client, getAsync, setexAsync } = require('../configs/redis-client');

// Get all attendance of all user in a monthly period. Admin only.
exports.get_attendances_of_all_users = [
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
        .json({ message: `Current user don't have admin privilege` });
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
    const year = parseInt(req.query.year || now.year);
    const month = parseInt(req.query.month || now.month);

    // Check cache
    const cachedResult = await getAsync(`Attendances:all:${year}:${month}`);
    if (cachedResult) {
      return res.status(200).json({
        message: 'Attendances of all users retrieved successfully',
        results: JSON.parse(cachedResult),
      });
    }

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
      // Retrieve attendances in period
      const attendances = await Attendance.find(
        {
          in_time: { $gte: startDate, $lt: endDate },
          out_time: { $exists: true },
        },
        '-_id -__v'
      )
        .lean({ virtuals: true })
        .populate('account', 'first_name last_name email');

      // Creating result object
      const results = attendances.map((attendance) => {
        const { first_name, last_name, email } = attendance.account;
        const { in_time, in_location, out_time, out_location, work_duration } =
          attendance;

        return {
          first_name,
          last_name,
          email,
          in_time,
          in_location,
          out_time,
          out_location,
          work_duration,
        };
      });

      // Send response to user
      res.status(200).json({
        message: 'Attendances of all users retrieved successfully',
        results,
      });

      // Save to cache for 1 minute. TODO: extend duration
      await setexAsync(
        `Attendances:all:${year}:${month}`,
        60,
        JSON.stringify(results)
      );
    } catch (err) {
      // Pass error to error handler
      return next(err);
    }
  },
];

exports.get_attendances_by_user_id = [
  param('userId')
    .isMongoId()
    .withMessage(`'user id is invalid`)
    .bail()
    .custom(async (id) => {
      const isAccountExist = await Account.exists({ _id: id });
      if (!isAccountExist) {
        throw new Error();
      }
    })
    .withMessage('user id is not registered in the system'),
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
    // Check validation result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message:
          'Request query parameters did not pass the validation process.',
        errors: errors.array(),
      });
    }

    // Check if current account match with requested user id in query params
    if (req.account.id !== req.params.userId) {
      return res.status(403).json({
        message:
          'Current account does not have access to the requested user id.',
      });
    }

    // Create current date object
    const now = DateTime.now().setZone('Asia/Jakarta');

    // Get year and month from query parameters with default current year and month
    const year = parseInt(req.query.year || now.year);
    const month = parseInt(req.query.month || now.month);

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
      // Retrieve attendances by user id in period
      const attendances = await Attendance.find(
        {
          in_time: { $gte: startDate, $lt: endDate },
          account: req.account.id,
          out_time: { $exists: true },
        },
        '-_id -__v -account'
      ).lean({ virtuals: true });

      // Creating result object
      const results = attendances.map((attendance) => {
        const { in_time, in_location, out_time, out_location, work_duration } =
          attendance;

        return {
          in_time,
          in_location,
          out_time,
          out_location,
          work_duration,
        };
      });

      return res.status(200).json({
        message: 'Attendance of requested user retrieved successfully.',
        results,
      });
    } catch (err) {
      return next(err);
    }
  },
];

exports.get_user_today_attendance_status = [
  param('userId')
    .isMongoId()
    .withMessage(`'user id is invalid`)
    .bail()
    .custom(async (id) => {
      const isAccountExist = await Account.exists({ _id: id });
      if (!isAccountExist) {
        throw new Error();
      }
    })
    .withMessage('user id is not registered in the system'),
  async (req, res, next) => {
    // Check validation result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message:
          'Request query parameters did not pass the validation process.',
        errors: errors.array(),
      });
    }

    // Check if current account match with requested user id in query params
    if (req.account.id !== req.params.userId) {
      return res.status(403).json({
        message:
          'Current account does not have access to the requested user id.',
      });
    }

    try {
      const userStatus = await Attendance.findByUserIdAndGetStatus(
        req.account.id
      );

      return res.status(200).json({
        message: 'User attendance status retrieved successfully.',
        data: userStatus,
      });
    } catch (err) {
      return next(err);
    }
  },
];

exports.check_in_attendance_by_user_id = [
  body('lat')
    .exists()
    .withMessage(`Required field 'lat' not found in request body`)
    .bail()
    .isFloat({ min: -90, max: 90 })
    .withMessage(`field 'lat' value must be a float number between -90 and 90`)
    .toFloat(),
  body('long')
    .exists()
    .withMessage(`Required field 'long' not found in request body`)
    .bail()
    .isFloat({ min: -180, max: 180 })
    .withMessage(
      `field 'long' value must be a float number between -180 and 180`
    )
    .toFloat(),
  async (req, res, next) => {
    // Check validation result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Request body fields did not pass the validation process.',
        errors: errors.array(),
      });
    }

    // Check if current account match with requested user id in query params
    if (req.account.id !== req.params.userId) {
      return res.status(403).json({
        message:
          'Current account does not have access to the requested user id.',
      });
    }

    try {
      // Get user status
      const userStatus = await Attendance.findByUserIdAndGetStatus(
        req.account.id
      );

      // Check if user can check in
      if (!userStatus.canCheckIn) {
        return res.status(403).json({
          message: 'Cannot check in this user. User already checked in today',
        });
      }

      // Calculate distance between user and the office
      const distance = getDistance(
        { latitude: req.body.lat, longitude: req.body.long },
        { latitude: -6.175, longitude: 106.8286 } // HARD CODED
      );

      // Check if user location is inside 100 meters radius
      if (distance > 100) {
        return res.status(400).json({
          message:
            'Location rejected. Must be inside 100 meters radius from the office',
        });
      }

      const attendanceObject = new Attendance({
        account: req.account.id,
        in_time: new Date(),
        in_location: { lat: req.body.lat, long: req.body.long },
      });

      await attendanceObject.save();

      return res.status(201).json({
        message: `Check in success. Time and location saved in the database.`,
      });
    } catch (err) {
      return next(err);
    }
  },
];

exports.check_out_attendance_by_user_id = [
  body('lat')
    .exists()
    .withMessage(`Required field 'lat' not found in request body`)
    .bail()
    .isFloat({ min: -90, max: 90 })
    .withMessage(`field 'lat' value must be a float number between -90 and 90`)
    .toFloat(),
  body('long')
    .exists()
    .withMessage(`Required field 'long' not found in request body`)
    .bail()
    .isFloat({ min: -180, max: 180 })
    .withMessage(
      `field 'long' value must be a float number between -180 and 180`
    )
    .toFloat(),
  async (req, res, next) => {
    // Check validation result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Request body fields did not pass the validation process.',
        errors: errors.array(),
      });
    }

    // Check if current account match with requested user id in query params
    if (req.account.id !== req.params.userId) {
      return res.status(403).json({
        message:
          'Current account does not have access to the requested user id.',
      });
    }

    try {
      // Get user status
      const userStatus = await Attendance.findByUserIdAndGetStatus(
        req.account.id
      );

      // Check if user can check out
      if (!userStatus.canCheckOut) {
        return res.status(403).json({ message: 'Cannot check out this user.' });
      }

      // Calculate distance between user and the office
      const distance = getDistance(
        { latitude: req.body.lat, longitude: req.body.long },
        { latitude: -6.175, longitude: 106.8286 } // HARD CODED
      );

      // Check if user location is inside 100 meters radius
      if (distance > 100) {
        return res.status(400).json({
          message:
            'Location rejected. Must be inside 100 meters radius from the office',
        });
      }

      const updatedAttendance = await Attendance.findByIdAndUpdate(
        userStatus.last_record.id,
        {
          $set: {
            out_time: new Date(),
            out_location: { lat: req.body.lat, long: req.body.long },
          },
        }
      );

      return res.status(201).json({
        message: `Check out success. Time and location saved in the database.`,
      });
    } catch (err) {
      return next(err);
    }
  },
];
