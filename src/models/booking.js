const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define the booking schema
const bookingSchema = new Schema({
  bookingStatus: {
    type: String,
    enum: ["UNCONFIRMED", "CONFIRMED", "CANCELLED"],
    default: "UNCONFIRMED",
  },
  hostelName: {
    type: String,
    required: true,
  },
  updateBy: {
    type: String,
    default: "System",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  bookingDate: {
    type: Date,
    default: Date.now,
  },
  bookedFromDt: {
    type: Date,
    required: true,
  },
  bookedToDt: {
    type: Date,
    required: true,
  },
  remark: {
    type: String,
    default: "",
  },
  bookPaymentId: {
    type: String,
    default: "",
  },
  amount: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  bookedBed: {
    type: Number,
    required: true,
  },
  totalRoom: {
    type: Number,
    required: true,
  },
  roomType: {
    type: String,
    required: true,
    enum: ["SINGLE_BED", "DOUBLE_BED", "TRIPLE_BED"],
  },
  bookedRoom: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  guestsList: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderid: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = mongoose.model("BookingDetails", bookingSchema);
