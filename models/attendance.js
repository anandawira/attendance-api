const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const { DateTime } = require('luxon');

const AttendanceSchema = new Schema({
  account: { type: Schema.Types.ObjectId, ref: 'Account' },
  in_time: { type: Date, required: true },
  in_location: {
    lat: { type: Number, required: true },
    long: { type: Number, required: true },
  },
  out_time: { type: Date },
  out_location: { lat: Number, long: Number },
});

// Get work duration in milliseconds
AttendanceSchema.virtual('work_duration_minutes').get(function () {
  if (this.out_time === undefined) {
    return undefined;
  }
  return Math.floor((this.out_time - this.in_time) / (60 * 1000));
});

// Get status
AttendanceSchema.statics.findByUserIdAndGetStatus = async function (userId) {
  try {
    // Get last record of user attendance
    const attendances = await this.find(
      {
        account: userId,
      },
      '-_id -__v -account'
    )
      .lean()
      .sort({ in_time: -1 })
      .limit(1);

    // Create start of today Date object
    const startOfToday = DateTime.now().setZone('Asia/Jakarta').startOf('day');

    // Check if query result length is 0, meaning that employee does not have any records yet
    if (attendances.length === 0) {
      return { canCheckIn: true, canCheckOut: false, last_record: null };
    }

    const attendance = attendances[0];

    // Check if out_time is undefined
    if (attendance.out_time === undefined) {
      return {
        canCheckIn: false,
        canCheckOut: true,
        last_record: attendance,
      };
    }

    // Check if in_time is yesterday
    if (attendance.in_time < startOfToday) {
      return { canCheckIn: true, canCheckOut: false, last_record: attendance };
    } else {
      return { canCheckIn: false, canCheckOut: false, last_record: attendance };
    }
  } catch (err) {
    throw new Error();
  }
};

// accountSchema.statics.isEmailExist = function (email) {
//   return this.findOne({ email: email });
// };

AttendanceSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Attendance', AttendanceSchema);
