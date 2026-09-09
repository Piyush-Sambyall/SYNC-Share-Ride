const express = require("express");
const router = express.Router();
const RecurringRide = require("../models/RecurringRide");
const { requireAuth } = require("./auth");

router.post("/", requireAuth, async (req, res) => {
  if (req.user.role !== "rider") return res.status(403).json({ error: "only riders can set up recurring rides" });
  try {
    const { pickup, dropoff, pickupLabel, dropoffLabel, depTime, days, prefs } = req.body;
    if (!pickup || !dropoff || !depTime || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: "pickup, dropoff, depTime, and at least one day are required" });
    }
    const schedule = await RecurringRide.create({
      riderId: req.user.riderId, pickup, dropoff, pickupLabel, dropoffLabel, depTime, days, prefs,
    });
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  if (req.user.role !== "rider") return res.status(403).json({ error: "only riders have recurring ride schedules" });
  const schedules = await RecurringRide.find({ riderId: req.user.riderId }).sort({ createdAt: -1 });
  res.json(schedules);
});

router.patch("/:id/active", requireAuth, async (req, res) => {
  const schedule = await RecurringRide.findOneAndUpdate(
    { _id: req.params.id, riderId: req.user.riderId },
    { isActive: !!req.body.isActive },
    { new: true }
  );
  if (!schedule) return res.status(404).json({ error: "schedule not found" });
  res.json(schedule);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const result = await RecurringRide.deleteOne({ _id: req.params.id, riderId: req.user.riderId });
  if (result.deletedCount === 0) return res.status(404).json({ error: "schedule not found" });
  res.json({ ok: true });
});

module.exports = router;
