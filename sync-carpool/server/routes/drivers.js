const express = require("express");
const router = express.Router();
const Driver = require("../models/Driver");
const { requireAuth } = require("./auth");

const EDITABLE_FIELDS = [
  "name", "email", "phone", "altPhone", "dob", "gender", "smoker", "userType",
  "idType", "idNumber", "profilePhoto",
  "vehicle", "plateNumber", "licenseNumber", "vehicleRcNumber", "insuranceNumber", "isEV", "upiId",
  "ac", "smoking", "music",
];

// --- authenticated driver's own profile (must come before the generic /:driverId route) ---
router.get("/me", requireAuth, async (req, res) => {
  if (req.user.role !== "driver") return res.status(403).json({ error: "not a driver account" });
  const driver = await Driver.findById(req.user.id).select("-passwordHash");
  if (!driver) return res.status(404).json({ error: "driver not found" });
  res.json(driver);
});

router.patch("/me", requireAuth, async (req, res) => {
  if (req.user.role !== "driver") return res.status(403).json({ error: "not a driver account" });
  const updates = {};
  for (const key of EDITABLE_FIELDS) if (key in req.body) updates[key] = req.body[key];
  try {
    const driver = await Driver.findByIdAndUpdate(req.user.id, updates, { new: true, returnDocument: "after", runValidators: true }).select("-passwordHash");
    if (!driver) return res.status(404).json({ error: "driver not found" });
    res.json(driver);
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstMsg = Object.values(err.errors)[0]?.message || err.message;
      return res.status(400).json({ error: firstMsg });
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch("/me/emergency-contact", requireAuth, async (req, res) => {
  if (req.user.role !== "driver") return res.status(403).json({ error: "not a driver account" });
  const { name, phone } = req.body;
  const driver = await Driver.findByIdAndUpdate(req.user.id, { emergencyContact: { name, phone } }, { new: true, returnDocument: "after" }).select("-passwordHash");
  if (!driver) return res.status(404).json({ error: "driver not found" });
  res.json(driver);
});

router.patch("/me/online", requireAuth, async (req, res) => {
  if (req.user.role !== "driver") return res.status(403).json({ error: "not a driver account" });
  const driver = await Driver.findByIdAndUpdate(req.user.id, { isOnline: !!req.body.isOnline }, { new: true, returnDocument: "after" }).select("-passwordHash");
  res.json(driver);
});

// --- general directory (used by matching + seed data, no auth needed to read) ---
router.get("/", async (req, res) => {
  const drivers = await Driver.find(req.query.online ? { isOnline: true } : {});
  res.json(drivers);
});

router.post("/", async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PUBLIC_FIELDS = "driverId name phone rating rideCount vehicle plateNumber profilePhoto isEV ac smoking music homeBase gender";

router.get("/:driverId", async (req, res) => {
  const driver = await Driver.findOne({ driverId: req.params.driverId }).select(PUBLIC_FIELDS);
  if (!driver) return res.status(404).json({ error: "driver not found" });
  res.json(driver);
});

router.patch("/:driverId/online", async (req, res) => {
  const driver = await Driver.findOneAndUpdate(
    { driverId: req.params.driverId },
    { isOnline: !!req.body.isOnline },
    { new: true, returnDocument: "after" }
  );
  if (!driver) return res.status(404).json({ error: "driver not found" });
  res.json(driver);
});

module.exports = router;
