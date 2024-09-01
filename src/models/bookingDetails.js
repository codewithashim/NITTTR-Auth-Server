const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    hostelName: {
      type: String,
      required: true,
    },
    remark: {
      type: String,
    },
    bookedToDt: {
      type: Date,
      required: true,
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    bookedFromDt: {
      type: Date,
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: ["CONFIRMED", "PENDING", "CANCELLED", "UNCONFIRMED"],
      default: "UNCONFIRMED",
    },
    bookedRoom: {
      type: String,
      required: true,
    },
    bookedBed: {
      type: Number,
      required: true,
    },
    bookPaymentId: {
      type: String,
    },
    guestsList: {
      type: [String],
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: { unique: true, collation: { locale: "en", strength: 2 } },
    },
    amount: {
      type: Number,
      required: true,
    },
    roomType: {
      type: String,
      required: true,
    },
    totalRoom: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["CONFIRMED", "FAILED"],
      default: "FAILED",
    },
    subtotal: {
      type: Number,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ["CREDIT_CARD", "DEBIT_CARD", "NET_BANKING", "UPI"],
      required: true,
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model('BookingDetails', bookingSchema, 'bookingDetails');

module.exports = Booking;
