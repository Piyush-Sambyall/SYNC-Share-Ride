const mongoose = require("mongoose");

const PHONE_REGEX = /^[6-9]\d{9}$/; // standard 10-digit Indian mobile format

const riderSchema = new mongoose.Schema(
  {
    riderId: { type: String, required: true, unique: true }, // "USR_RIDER_..."
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: {
      type: String,
      required: [true, "a 10-digit mobile number is required"],
      validate: { validator: (v) => PHONE_REGEX.test(v), message: (p) => `${p.value} is not a valid 10-digit Indian mobile number` },
    },
    altPhone: String,
    gender: { type: String, enum: ["M", "F", "O"], default: "O" },
    userType: { type: String, enum: ["student", "faculty"], default: "student" },
    smoker: { type: Boolean, default: false },
    dob: Date,
    idType: { type: String, enum: ["student_id", "govt_id"], default: "student_id" },
    idNumber: String,
    profilePhoto: String, // base64 data URL — see README note on file storage
    rating: { type: Number, default: 4.0, min: 1, max: 5 },
    rideCount: { type: Number, default: 0 },
    emergencyContact: {
      name: String,
      phone: String,
    },
    // ride preferences, used by the matching engine and shown back in the ride form
    prefAc: { type: Boolean, default: true },
    prefNoSmoking: { type: Boolean, default: false },
    prefSameGender: { type: Boolean, default: false },
    prefEvOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rider", riderSchema);
module.exports.PHONE_REGEX = PHONE_REGEX;
