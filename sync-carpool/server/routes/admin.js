const express = require("express");
const router = express.Router();
const Rider = require("../models/Rider");
const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const { requireAuth, requireRole } = require("./auth");

router.use(requireAuth, requireRole("admin"));

router.get("/riders", async (req, res) => {
  const riders = await Rider.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json(riders);
});

router.get("/drivers", async (req, res) => {
  const drivers = await Driver.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json(drivers);
});

router.get("/rides", async (req, res) => {
  const rides = await Ride.find().sort({ createdAt: -1 }).limit(200);
  res.json(rides);
});

router.get("/summary", async (req, res) => {
  const [riderCount, driverCount, rideCount, onlineDrivers, ratingAgg, completedRides] = await Promise.all([
    Rider.countDocuments(),
    Driver.countDocuments(),
    Ride.countDocuments(),
    Driver.countDocuments({ isOnline: true }),
    Driver.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]),
    Ride.countDocuments({ status: "completed" }),
  ]);
  const avgDriverRating = ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 100) / 100 : null;
  res.json({ riderCount, driverCount, rideCount, onlineDrivers, avgDriverRating, completedRides });
});

module.exports = router;
