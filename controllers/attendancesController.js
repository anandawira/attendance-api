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
    const attendances = await Attendance.find({}).lean();
    return res.json(attendances);
  } catch (err) {
    return next(err);
  }
  // Send response to user
};
