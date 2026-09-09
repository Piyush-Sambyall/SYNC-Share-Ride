const express = require("express");
const router = express.Router();
const Rider = require("../models/Rider");
const { requireAuth } = require("./auth");

const EDITABLE_FIELDS = [
  "name", "email", "phone", "altPhone", "dob", "gender", "smoker", "userType",
  "idType", "idNumber", "profilePhoto",
  "prefAc", "prefNoSmoking", "prefSameGender", "prefEvOnly",
];

router.get("/me", requireAuth, async (req, res) => {
  if (req.user.role !== "rider") return res.status(403).json({ error: "not a rider account" });
  const rider = await Rider.findById(req.user.id).select("-passwordHash");
  if (!rider) return res.status(404).json({ error: "rider not found" });
  res.json(rider);
});

router.patch("/me", requireAuth, async (req, res) => {
  if (req.user.role !== "rider") return res.status(403).json({ error: "not a rider account" });
  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in req.body) updates[key] = req.body[key];
  }
  try {
    const rider = await Rider.findByIdAndUpdate(req.user.id, updates, { new: true, returnDocument: "after", runValidators: true }).select("-passwordHash");
    if (!rider) return res.status(404).json({ error: "rider not found" });
    res.json(rider);
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstMsg = Object.values(err.errors)[0]?.message || err.message;
      return res.status(400).json({ error: firstMsg });
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch("/me/emergency-contact", requireAuth, async (req, res) => {
  if (req.user.role !== "rider") return res.status(403).json({ error: "not a rider account" });
  const { name, phone } = req.body;
  const rider = await Rider.findByIdAndUpdate(req.user.id, { emergencyContact: { name, phone } }, { new: true, returnDocument: "after" }).select("-passwordHash");
  if (!rider) return res.status(404).json({ error: "rider not found" });
  res.json(rider);
});

// Public lookup for a driver to see who they're picking up — safe fields
// only, mirrors routes/drivers.js's equivalent for the rider's side.
const PUBLIC_FIELDS = "riderId name phone rating rideCount profilePhoto gender";

router.get("/:riderId", async (req, res) => {
  const rider = await Rider.findOne({ riderId: req.params.riderId }).select(PUBLIC_FIELDS);
  if (!rider) return res.status(404).json({ error: "rider not found" });
  res.json(rider);
});

module.exports = router;
