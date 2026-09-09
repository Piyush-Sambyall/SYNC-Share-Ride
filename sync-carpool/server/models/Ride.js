const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    riderId: { type: String, required: true },     // e.g. "USR_RIDER_01"
    driverId: { type: String, required: true },     // e.g. "USR_PIYUSH_DRIVER"
    pickup: { type: pointSchema, required: true },
    dropoff: { type: pointSchema, required: true },
    pickupLabel: String,
    dropoffLabel: String,
    otp: { type: String, required: true },
    status: {
      type: String,
      enum: ["requested", "driver_en_route", "arrived", "in_progress", "completed", "cancelled"],
      default: "requested",
    },
    compatibilityScore: { type: Number, min: 0, max: 1 },
    scoreBreakdown: {
      route_overlap: Number,
      detour_km: Number,
      time_overlap_min: Number,
      pref_match: Number,
      trust_score: Number,
      pickup_distance_km: Number,
    },
    lastLocation: {
      lat: Number,
      lng: Number,
      heading: Number,
      speedKmh: Number,
      updatedAt: Date,
    },
    verification: {
      plateConfirmed: { type: Boolean, default: false },
      photoConfirmed: { type: Boolean, default: false },
      otpConfirmed: { type: Boolean, default: false },
    },
    // explicit lifecycle timestamps, so this collection doubles as the
    // "which rider went with which driver, on what route, at what time" log
    startedAt: Date,
    arrivedAt: Date,
    completedAt: Date,
    routeLog: [
      {
        lat: Number,
        lng: Number,
        at: { type: Date, default: Date.now },
      },
    ],
    distanceKm: Number, // computed from pickup->dropoff at booking time; see engine/compatibilityModel.js haversineKm

    // --- fare + payment ---
    fare: {
      totalRs: Number,
      splitCount: { type: Number, default: 1 }, // number of riders sharing this trip's cost
      perRiderRs: Number,
      method: { type: String, enum: ["razorpay", "cash"] },
      status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      paidAt: Date,
    },

    // --- recurring schedule this ride was generated from, if any ---
    recurringRideId: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringRide" },

    // rider rating the driver, post-trip (existing, now with a text review)
    rating: {
      stars: { type: Number, min: 1, max: 5 },
      review: String,
      tags: [String],
    },
    // driver rating the rider, post-trip (added — ratings now go both ways)
    riderRating: {
      stars: { type: Number, min: 1, max: 5 },
      review: String,
      tags: [String],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);
