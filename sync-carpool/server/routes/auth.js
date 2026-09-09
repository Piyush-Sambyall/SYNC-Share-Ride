const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Rider = require("../models/Rider");
const Driver = require("../models/Driver");
const Admin = require("../models/Admin");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-this-in-production";
const MIET_EMAIL_DOMAIN = "@mietjammu.in";

function makeId(role) {
  const n = crypto.randomInt(100000, 999999);
  return role === "driver" ? `USR_D${n}_DRIVER` : `USR_RIDER_${n}`;
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Mongoose ValidationErrors (bad phone format, bad plate format, missing
// required field) get a clean 400 with the actual reason instead of a raw
// 500 -- this is what makes the phone/plate regex validators in the models
// actually useful to the person filling out the form.
function friendlyError(err, res) {
  if (err.name === "ValidationError") {
    const firstMsg = Object.values(err.errors)[0]?.message || err.message;
    return res.status(400).json({ error: firstMsg });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: "an account with this email already exists" });
  }
  return res.status(500).json({ error: err.message });
}

function publicRider(r) {
  return { id: r._id, role: "rider", riderId: r.riderId, name: r.name, email: r.email, profilePhoto: r.profilePhoto };
}
function publicDriver(d) {
  return { id: d._id, role: "driver", driverId: d.driverId, name: d.name, email: d.email, profilePhoto: d.profilePhoto };
}
function publicAdmin(a) {
  return { id: a._id, role: "admin", name: a.name, email: a.email };
}

/**
 * POST /api/auth/signup
 * body includes `role: "rider" | "driver"` plus the fields for that role.
 * Riders are saved to the Rider collection, drivers to the Driver
 * collection -- these are two separate MongoDB collections, not a shared
 * "users" table with a role flag.
 */
router.post("/signup", async (req, res) => {
  try {
    const { role = "rider", name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }
    const lowerEmail = email.toLowerCase().trim();
    if (!lowerEmail.endsWith(MIET_EMAIL_DOMAIN)) {
      return res.status(400).json({ error: `signup is restricted to MIET email addresses (must end in ${MIET_EMAIL_DOMAIN})` });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const common = {
      name, email: lowerEmail, passwordHash,
      phone: req.body.phone, altPhone: req.body.altPhone,
      gender: req.body.gender, userType: req.body.userType, smoker: !!req.body.smoker,
      dob: req.body.dob || undefined,
      idType: req.body.idType, idNumber: req.body.idNumber,
    };

    if (role === "driver") {
      const existing = await Driver.findOne({ email: lowerEmail });
      if (existing) return res.status(409).json({ error: "an account with this email already exists" });

      const driver = await Driver.create({
        ...common,
        driverId: makeId("driver"),
        vehicle: req.body.vehicle,
        plateNumber: req.body.plateNumber,
        licenseNumber: req.body.licenseNumber,
        vehicleRcNumber: req.body.vehicleRcNumber,
        insuranceNumber: req.body.insuranceNumber,
        isEV: !!req.body.isEV,
        isOnline: false,
      });
      const token = signToken({ id: driver._id, role: "driver", driverId: driver.driverId, name: driver.name });
      return res.status(201).json({ token, user: publicDriver(driver) });
    }

    // default: rider
    const existing = await Rider.findOne({ email: lowerEmail });
    if (existing) return res.status(409).json({ error: "an account with this email already exists" });

    const rider = await Rider.create({
      ...common,
      riderId: makeId("rider"),
      prefAc: req.body.prefAc !== undefined ? !!req.body.prefAc : true,
      prefNoSmoking: !!req.body.prefNoSmoking,
      prefSameGender: !!req.body.prefSameGender,
      prefEvOnly: !!req.body.prefEvOnly,
    });
    const token = signToken({ id: rider._id, role: "rider", riderId: rider.riderId, name: rider.name });
    res.status(201).json({ token, user: publicRider(rider) });
  } catch (err) {
    friendlyError(err, res);
  }
});

/**
 * POST /api/auth/login
 * Checks Rider, then Driver, then Admin collections by email.
 * (Emails are only enforced unique within each collection, not globally
 * across all three -- fine for a project this size, worth tightening
 * with a shared email index before any real deployment.)
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });
    const lower = email.toLowerCase();

    const rider = await Rider.findOne({ email: lower });
    if (rider && (await bcrypt.compare(password, rider.passwordHash))) {
      const token = signToken({ id: rider._id, role: "rider", riderId: rider.riderId, name: rider.name });
      return res.json({ token, user: publicRider(rider) });
    }

    const driver = await Driver.findOne({ email: lower });
    if (driver && driver.passwordHash && (await bcrypt.compare(password, driver.passwordHash))) {
      const token = signToken({ id: driver._id, role: "driver", driverId: driver.driverId, name: driver.name });
      return res.json({ token, user: publicDriver(driver) });
    }

    const admin = await Admin.findOne({ email: lower });
    if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
      const token = signToken({ id: admin._id, role: "admin", name: admin.name });
      return res.json({ token, user: publicAdmin(admin) });
    }

    res.status(401).json({ error: "invalid email or password" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing auth token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: "not authorized for this action" });
    next();
  };
}

router.get("/me", requireAuth, async (req, res) => {
  if (req.user.role === "driver") {
    const d = await Driver.findById(req.user.id).select("-passwordHash");
    if (!d) return res.status(404).json({ error: "driver not found" });
    return res.json({ ...d.toObject(), role: "driver" });
  }
  if (req.user.role === "admin") {
    const a = await Admin.findById(req.user.id).select("-passwordHash");
    if (!a) return res.status(404).json({ error: "admin not found" });
    return res.json({ ...a.toObject(), role: "admin" });
  }
  const r = await Rider.findById(req.user.id).select("-passwordHash");
  if (!r) return res.status(404).json({ error: "rider not found" });
  res.json({ ...r.toObject(), role: "rider" });
});

module.exports = { router, requireAuth, requireRole };
