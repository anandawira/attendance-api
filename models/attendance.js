const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AttendanceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  in_time: { type: Date, required: true },
  in_location: { lat: Number, long: Number, required: true },
  out_time: { type: Date },
  out_location: { lat: Number, long: Number },
});

// Get work duration in milliseconds
AttendanceSchema.virtual("work_duration").get(function () {
  if (this.out_time === undefined) {
    return undefined;
  }
  return this.out_time - this.in_time;
});

module.exports = mongoose.model("Attendance", AttendanceSchema);
