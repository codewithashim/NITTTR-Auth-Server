const mongoose = require("mongoose");
const { userType } = require("../constants");
const { Schema } = require("mongoose");

const socialLoginSchema = mongoose.Schema({
  provider: {
    type: String,
    enum: ["facebook", "google", "apple"],
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
});

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    index: { unique: true },
  },
  number: {
    type: String,
    index: { unique: true },
  },
  password: {
    type: String,
  },
  role: {
    type: String,
    enum: [userType.ADMIN, userType.USER, userType.SUPERADMIN],
    required: true,
  },

  social_logins: [socialLoginSchema],
  email_verification_token: {
    type: String,
  },
  verification_code: {
    type: Number,
  },
  verified_code: {
    type: Boolean,
    default: false,
  },
  is_email_verified: {
    type: Boolean,
    default: false,
  },

  date_registered: {
    type: Date,
    default: Date.now,
  },
  password_reset_token: {
    token: String,
    expires: Date,
  },
  status: {
    type: Number,
    required: true,
    default: 1,
  },
  created_at: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("users", userSchema);
