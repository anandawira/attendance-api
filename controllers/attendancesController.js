const Attendance = require('../models/attendance');
const Account = require('../models/account');
const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const { query, param, validationResult, body } = require('express-validator');
const { getDistance } = require('geolib');
const { getAsync, setexAsync, delAsync } = require('../configs/redis-client');
const moment = require('moment-business-days');
require('moment-timezone');

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
    
    // Filter future date
    if (now < startDate) {
      return res.status(400).json({
        message: 'Bad request. Requested date not applicable.'});
    }

    try {
      // Get all business/active day in month period
      const businessDay = moment(
        '01-' + month + '-' + year,
        'DD-MM-YYYY'
      ).monthBusinessDays();

      // Retrieve approved account and not admin
      const account = await Account.find(
        {
          status: 'approved',
          isAdmin: false,
        },
        {
          first_name: 1,
          last_name: 1,
          email: 1,
        }
      );

      // Creating object from cartesian with account and all business day
      let accountAllDay = [];
      account.map((account) => {
        const { _id, first_name, last_name, email } = account;
        businessDay.forEach((day) => {
          // Filter future date
          if (now < day) { return; }

          let element = {};
          element._id = _id;
          element.first_name = first_name;
          element.last_name = last_name;
          element.email = email;
          element.day = day.format('YYYY-MM-DD');
          console.log(element.day);

          accountAllDay.push(element);
        });
      });

      // Creating object from attendance and account
      const attendances = await Attendance.find(
        {
          in_time: { $gte: startDate, $lt: endDate },
        }
      )
        .lean({ virtuals: true })
        .populate('account');

      // Creating object attendances and account
      const attendanceAccount = attendances.map((attendance) => {
        const { _id } = attendance.account;
        const {
          in_time,
          in_location,
          out_time,
          out_location,
          work_duration_minutes,
          reason,
          description,
        } = attendance;

        // Date format
        const match_day = in_time.toISOString().slice(0, 10);

        return {
          _id,
          in_time,
          in_location,
          out_time,
          out_location,
          work_duration_minutes,
          reason,
          description,
          match_day,
        };
      });

      // Append result from accountAllDay and attended day
      const results = accountAllDay.map((val) => {

        // Matching id and day
        let attendDay = attendanceAccount.find(element =>
          element._id.toString() === val._id.toString() &&
          element.match_day === val.day
        );

        // Check if undefined
        let temp = (attendDay !== undefined) ? attendDay : [];
        
        // Append to object
        val.in_time               = (temp.in_time || null);
        val.in_location           = (temp.in_location || null);
        val.out_time              = (temp.out_time|| null);
        val.out_location          = (temp.out_location|| null);
        val.work_duration_minutes = (temp.work_duration_minutes|| null);
        val.reason                = (temp.reason || null);
        val.description           = (temp.description || null);

        return val;
      });


      // Send response to user
      res.status(200).json({
        message: 'Attendances of all users retrieved successfully',
        results,
      });

      // Save to cache for 1 hour and will be deleted early when any user checked out.
      setexAsync(
        `Attendances:all:${year}:${month}`,
        1 * 60 * 60,
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
    if (req.account.id !== req.params.userId && !req.account.isAdmin) {
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
    // const startDate = DateTime.fromObject({ year: year, month: month, day:'15' }).setZone(
    //   'Asia/Jakarta'
    // );
    const startDate = DateTime.fromObject({ year: year, month: month }).setZone(
      'Asia/Jakarta'
    );
    const endDate = DateTime.fromObject(
      month !== 12
        ? { year: year, month: month + 1 }
        : { year: year + 1, month: 1 }
    ).setZone('Asia/Jakarta');
    
    // Filter future date
    if (now < startDate) {
      return res.status(400).json({
        message: 'Bad request. Requested date not applicable.'});
    }

    try {
      // Get all business/active day in month period
      const businessDay = moment(
        '01-' + month + '-' + year,
        'DD-MM-YYYY'
      ).monthBusinessDays();

      // Retrieve attendances by user id in period
      const attendances = await Attendance.find(
        {
          in_time: { $gte: startDate, $lt: endDate },
          account: req.account.id,
        }
      ).lean({ virtuals: true });
      
      // Mapping attendances
      const userAttendance = attendances.map((attendance) => {
        const {
          in_time,
          in_location,
          out_time,
          out_location,
          work_duration_minutes,
          reason,
          description,
        } = attendance;

        // Date format
        const match_day = in_time.toISOString().slice(0, 10);

        return {
          in_time,
          in_location,
          out_time,
          out_location,
          work_duration_minutes,
          reason,
          description,
          match_day,
        };
      });

      // Creating result from attendances and all business day
      const results = businessDay.filter((rawDay) => {
        // Filter future date
        if (now < rawDay) {
          return false;
        }
        return true;
      }).map((rawDay)=>{       
        // Date format
        const day = rawDay.format('YYYY-MM-DD');
        
        // Create object
        let val = {};

        // Matching day
        let attendDay = userAttendance.find(element => element.match_day === day);

        // Check if undefined
        let temp = (attendDay !== undefined) ? attendDay : [];

        // Append to object
        val.in_time               = (temp.in_time || null);
        val.in_location           = (temp.in_location || null);
        val.out_time              = (temp.out_time|| null);
        val.out_location          = (temp.out_location|| null);
        val.work_duration_minutes = (temp.work_duration_minutes|| null);
        val.reason                = (temp.reason || null);
        val.description           = (temp.description || null);
        val.day                   = day;

        return val;
      });
      
      // Return response to user
      return res.status(200).json({
        message: 'Attendance of requested user retrieved successfully!.',
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

      return res.status(200).json({
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

      // insert out_time and out_location to attendance object
      const updatedAttendance = await Attendance.findByIdAndUpdate(
        userStatus.last_record.id,
        {
          $set: {
            out_time: new Date(),
            out_location: { lat: req.body.lat, long: req.body.long },
          },
        }
      );

      // Send response to client
      res.status(200).json({
        message: `Check out success. Time and location saved in the database.`,
      });

      // Remove cache for the month
      const now = DateTime.now().setZone('Asia/Jakarta');
      const { year, month } = now;
      await delAsync(`Attendances:all:${year}:${month}`);

      return;
    } catch (err) {
      return next(err);
    }
  },
];

// Get all absences of all user in a monthly period. Admin only.
exports.get_all_absences = [
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
      // Get all business/active day in month period
      const businessDay = moment(
        '01-' + month + '-' + year,
        'DD-MM-YYYY'
      ).monthBusinessDays();

      // Retrieve approved account and not admin
      const account = await Account.find(
        {
          status: 'approved',
          isAdmin: false,
        },
        {
          first_name: 1,
          last_name: 1,
          email: 1,
        }
      );

      // Creating object from cartesian with account and all business day
      var accountAllDay = [];
      account.map((account) => {
        const { _id, first_name, last_name, email } = account;
        businessDay.forEach((day) => {
          let element = {};
          element.id = _id;
          element.first_name = first_name;
          element.last_name = last_name;
          element.email = email;
          element.day = day.format('YYYY-MM-DD');
          accountAllDay.push(element);
        });
      });

      // Creating object from attendance and account
      const attendances = await Attendance.find(
        {
          in_time: { $gte: startDate, $lt: endDate },
          out_time: { $exists: true },
        },
        '-__v'
      )
        .lean({ virtuals: true })
        .populate('account', 'first_name last_name email isAdmin status');

      // Creating object from attendance and account
      const attendanceAccount = attendances.filter((attendance) =>{
        const { _id, isAdmin, status } = attendance.account;
        const { work_duration_minutes} = attendance;
        const count = attendances.filter((obj) => obj.account._id === _id).length;
        // Filter with approved account, non admin, 9 hours in work time, and not attending more than 3 days
        if (
          status == 'approved' &&
          isAdmin==false &&
          work_duration_minutes >= 540 &&
          count <= (businessDay.length - 3 )
          )
        {
          return true;
        }
        return false;
      })
      // Mapping to object
      .map((attendance) => {
        const { _id, first_name, last_name, email } = attendance.account;
        const { in_time } = attendance;
        const day = in_time.toISOString().slice(0, 10);
        const id = _id;
        return {
          id,
          first_name,
          last_name,
          email,
          day,
        };
      });

      // Return not exist attendances
      const results = accountAllDay.filter(
        (val) => !attendanceAccount.includes(val)
      );

      // Send response to user
      return res.status(200).json({
        message: 'Absences of all users retrieved successfully',
        results,
      });
    } catch (err) {
      // Pass error to error handler
      return next(err);
    }
  },
];

exports.correct_incomplete_attendance = [
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
  query('date').isDate().withMessage(`'date is invalid`),
  body('reason')
    .exists()
    .withMessage(`Required field 'reason' not found in request body`)
    .bail()
    .isIn(['leave', 'sick', 'other'])
    .withMessage("reason value should be 'leave', 'sick', or 'other'"),
  body('description')
    .exists()
    .withMessage(`Required field 'description' not found in request body`),
  async (req, res, next) => {
    // Check validation result
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message:
          'Request parameters did not pass the validation process.',
        errors: errors.array(),
      });
    }

    // Check if user is admin
    if (!req.account.isAdmin) {
      return res
        .status(403)
        .json({ message: `Current user don't have admin privilege.` });
    }

    // Extract date
    let [year, month, day] = req.query.date.split(/\W/);
    year = parseInt(year);
    month = parseInt(month);
    day = parseInt(day);

    // Create date objects
    const startDate = DateTime.fromObject({
      year: year,
      month: month,
      day: day,
    }).setZone('Asia/Jakarta');

    const endDate = startDate.plus({ days: 1 });

    const inTime = DateTime.fromObject({
      year: year,
      month: month,
      day: day,
      hour: 8,
    }).setZone('Asia/Jakarta');

    const outTime = DateTime.fromObject({
      year: year,
      month: month,
      day: day,
      hour: 17,
    }).setZone('Asia/Jakarta');

    try {
      // Check if correction allowed
      const attendances = await Attendance.find({
        account: req.params.userId,
        in_time: { $gte: startDate, $lt: endDate },
      }).lean({ virtuals: true });

      if (attendances.length !== 0) {
        if (
          attendances[0].out_time !== undefined &&
          attendances[0].in_time !== undefined
        ) {
          return res
            .status(405)
            .json({ message: 'Cannot modify this attendance' });
        }
      }

      // Correct the attendance
      if (attendances.length === 0) {
        const attendance = new Attendance({
          account: mongoose.Types.ObjectId(req.params.userId),
          in_time: inTime,
          in_location: { lat: -6.175, long: 106.8286 },
          out_time: outTime,
          out_location: { lat: -6.175, long: 106.8286 },
          reason: req.body.reason,
          description: req.body.description,
        });
        await attendance.save();
      } else {
        await Attendance.findByIdAndUpdate(attendances[0].id, {
          $set: {
            in_time: inTime,
            in_location: { lat: -6.175, long: 106.8286 },
            out_time: outTime,
            out_location: { lat: -6.175, long: 106.8286 },
            reason: req.body.reason,
            description: req.body.description,
          },
        });
      }

      return res
        .status(200)
        .json({ message: 'User attendance corrected successfully.' });
    } catch (err) {
      return next(err);
    }
  },
];
