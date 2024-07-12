// models/Otp.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
