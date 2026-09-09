const mongoose = require("mongoose");

const PHONE_REGEX = /^[6-9]\d{9}$/;
// Standard Indian vehicle registration format: 2 letters (state), 1-2 digits
// (RTO code), 1-3 letters (series), 4 digits — e.g. "JK02AB1234". Stored
// without spaces internally; displayed with spaces for readability.
const PLATE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;

const driverSchema = new mongoose.Schema(
  {
    driverId: { type: String, required: true, unique: true }, // "USR_..._DRIVER"
    name: { type: String, required: true },

    // --- auth ---
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: String,

    // --- personal info ---
    phone: {
      type: String,
      required: [true, "a 10-digit mobile number is required"],
      validate: { validator: (v) => PHONE_REGEX.test(v), message: (p) => `${p.value} is not a valid 10-digit Indian mobile number` },
    },
    altPhone: String,
    gender: { type: String, enum: ["M", "F", "O"], default: "O" },
    userType: { type: String, enum: ["student", "faculty"], default: "student" },
    smoker: { type: Boolean, default: false }, // the driver's own habit, distinct from `smoking` below (whether smoking is allowed in the car)
    dob: Date,
    idType: { type: String, enum: ["student_id", "govt_id"], default: "govt_id" },
    idNumber: String,
    profilePhoto: String, // base64 data URL — see README note on file storage
    emergencyContact: {
      name: String,
      phone: String,
    },

    // --- vehicle + safety info ---
    vehicle: String,
    plateNumber: {
      type: String,
      required: [true, "a vehicle plate number is required"],
      uppercase: true,
      set: (v) => (v ? v.replace(/\s+/g, "").toUpperCase() : v), // normalize "JK02 AB 1234" -> "JK02AB1234" for validation/storage
      validate: { validator: (v) => PLATE_REGEX.test(v), message: (p) => `${p.value} doesn't look like a valid Indian vehicle plate (e.g. JK02AB1234)` },
    },
    licenseNumber: String,
    vehicleRcNumber: String,
    insuranceNumber: String,
    isEV: { type: Boolean, default: false },
    upiId: String, // e.g. "name@okhdfcbank" — used to generate a payment QR as a fallback if a rider's UPI app checkout doesn't work

    // --- ride preferences ---
    ac: { type: Boolean, default: true },
    smoking: { type: Boolean, default: false }, // whether smoking is allowed in the vehicle
    music: { type: Boolean, default: true },

    // --- trust + matching ---
    rating: { type: Number, default: 4.0, min: 1, max: 5 },
    rideCount: { type: Number, default: 0 },
    homeBase: {
      lat: Number,
      lng: Number,
    },
    isOnline: { type: Boolean, default: false },
    typicalDepartureMinute: Number, // minutes after midnight, e.g. 495 = 8:15 AM

    // --- recurring schedule (lightweight — see RecurringRide model for the full version) ---
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", driverSchema);
module.exports.PHONE_REGEX = PHONE_REGEX;
module.exports.PLATE_REGEX = PLATE_REGEX;
