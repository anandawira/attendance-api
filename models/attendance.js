const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');

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

AttendanceSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Attendance', AttendanceSchema);
