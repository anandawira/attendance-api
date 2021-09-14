const Attendance = require('../models/attendance');

// TODO: filter by period
exports.get_all_attendances = async (req, res, next) => {
  // Check if user is admin
  if (!req.account.isAdmin) {
    return res
      .status(403)
      .json({ message: `This user don't have admin privilege` });
  }

  try {
    // Retrieve all attendances
    const attendances = await Attendance.find({
      out_time: { $exists: true },
    }).lean({ virtuals: true });

    // Send response to user
    return res.json(attendances);
  } catch (err) {
    // Pass error to error handler
    return next(err);
  }
};
