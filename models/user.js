const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  first_name: { type: String, required: true, maxlength: 50 },
  last_name: { type: String, required: true, maxlength: 50 },
  email: {
    type: String,
    required: true,
    maxlength: 100,
    unique: true,
  },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  attendances: [{ type: Schema.Types.ObjectId, ref: 'Attendance' }],
}, {timestamps: true});

UserSchema.statics.findByIdAndChangePassword = async function (id, hashedPassword){
  return await this.findByIdAndUpdate(id, {password: hashedPassword})
}

module.exports = mongoose.model('User', UserSchema);
