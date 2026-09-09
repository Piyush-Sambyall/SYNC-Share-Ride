const mongoose = require("mongoose");

const recurringRideSchema = new mongoose.Schema(
  {
    riderId: { type: String, required: true },
    pickup: { lat: Number, lng: Number },
    dropoff: { lat: Number, lng: Number },
    pickupLabel: String,
    dropoffLabel: String,
    depTime: { type: String, required: true }, // "08:15" (24h, local time)
    days: {
      // which days of the week this schedule runs on
      type: [String],
      enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      required: true,
      validate: (v) => v.length > 0,
    },
    prefs: {
      ac: Boolean,
      nosmoking: Boolean,
      samegender: Boolean,
      evOnly: Boolean,
    },
    isActive: { type: Boolean, default: true },
    lastTriggeredDate: String, // "YYYY-MM-DD" of the last day this schedule auto-created a ride, prevents double-booking
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecurringRide", recurringRideSchema);
