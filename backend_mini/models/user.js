const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  otp: {  // Add OTP field
    type: String,
    default: null,
  },
  otpExpires: {  // Add expiration time for OTP
    type: Date,
    default: null,
  },
});

module.exports = model('User', UserSchema);
