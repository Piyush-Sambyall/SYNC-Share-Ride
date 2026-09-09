const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Ride = require("../models/Ride");
const Driver = require("../models/Driver");
const Rider = require("../models/Rider");
const { haversineKm } = require("../engine/compatibilityModel");

const BASE_FARE_RS = 15;
const RATE_PER_KM_RS = 8;

function makeOtp() {
  return String(crypto.randomInt(1000, 9999));
}

function estimateFare(pickup, dropoff) {
  const distanceKm = haversineKm([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]);
  const totalRs = Math.round(BASE_FARE_RS + distanceKm * RATE_PER_KM_RS);
  return { distanceKm: Math.round(distanceKm * 100) / 100, totalRs };
}

module.exports = (io) => {
  // Create a ride once a match is confirmed
  router.post("/", async (req, res) => {
    try {
      const { riderId, driverId, pickup, dropoff, pickupLabel, dropoffLabel, compatibilityScore, scoreBreakdown } = req.body;
      const { distanceKm, totalRs } = estimateFare(pickup, dropoff);
      const ride = await Ride.create({
        riderId, driverId, pickup, dropoff, pickupLabel, dropoffLabel,
        otp: makeOtp(), status: "driver_en_route",
        compatibilityScore, scoreBreakdown,
        distanceKm,
        fare: { totalRs, splitCount: 1, perRiderRs: totalRs, status: "pending" },
      });
      res.status(201).json(ride);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // A driver's own list of active/recent rides (for their dashboard)
  router.get("/for-driver/:driverId", async (req, res) => {
    const rides = await Ride.find({ driverId: req.params.driverId }).sort({ createdAt: -1 }).limit(20);
    res.json(rides);
  });

  // A rider's own list of active/recent rides (so they can rejoin an active ride after a refresh)
  router.get("/for-rider/:riderId", async (req, res) => {
    const rides = await Ride.find({ riderId: req.params.riderId }).sort({ createdAt: -1 }).limit(20);
    res.json(rides);
  });

  // Personal stats + chart-ready data for the dashboard, for either role
  router.get("/stats/:role/:id", async (req, res) => {
    const { role, id } = req.params;
    const filter = role === "driver" ? { driverId: id } : { riderId: id };
    const rides = await Ride.find(filter).sort({ createdAt: 1 });

    const completed = rides.filter((r) => r.status === "completed");
    const totalDistanceKm = Math.round(completed.reduce((sum, r) => sum + (r.distanceKm || 0), 0) * 10) / 10;
    const totalSpentOrEarnedRs = completed.reduce((sum, r) => sum + (r.fare?.perRiderRs || 0), 0);
    const ratings = completed.map((r) => (role === "driver" ? r.rating?.stars : r.riderRating?.stars)).filter(Boolean);
    const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : null;

    // group completed rides by ISO week for the "rides over time" chart
    const byWeek = {};
    for (const r of completed) {
      const d = r.completedAt || r.createdAt;
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      byWeek[key] = (byWeek[key] || 0) + 1;
    }
    const ridesByWeek = Object.entries(byWeek).map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week));

    res.json({
      totalRides: rides.length,
      completedRides: completed.length,
      cancelledRides: rides.filter((r) => r.status === "cancelled").length,
      totalDistanceKm,
      totalSpentOrEarnedRs,
      avgRating,
      ridesByWeek,
    });
  });

  router.get("/:id", async (req, res) => {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "ride not found" });
    res.json(ride);
  });

  // Driver's browser posts a GPS ping every few seconds while a ride is active
  router.post("/:id/location", async (req, res) => {
    try {
      const { lat, lng, heading = 0, speedKmh = 0 } = req.body;
      const ride = await Ride.findByIdAndUpdate(
        req.params.id,
        {
          lastLocation: { lat, lng, heading, speedKmh, updatedAt: new Date() },
          $push: { routeLog: { $each: [{ lat, lng, at: new Date() }], $slice: -300 } },
        },
        { new: true, returnDocument: "after" }
      );
      if (!ride) return res.status(404).json({ error: "ride not found" });

      io.to(ride.id).emit("location:update", { rideId: ride.id, lat, lng, heading, speedKmh });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Rider sets how many people are splitting this ride's cost (including themselves).
  // This is an equal-split calculator scoped to one ride, not a multi-account ledger --
  // it doesn't track named co-riders individually, just recomputes the per-head share.
  router.post("/:id/split", async (req, res) => {
    const splitCount = Math.max(1, parseInt(req.body.splitCount, 10) || 1);
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "ride not found" });
    if (!ride.fare?.totalRs) return res.status(400).json({ error: "this ride doesn't have a fare set yet" });

    ride.fare.splitCount = splitCount;
    ride.fare.perRiderRs = Math.round(ride.fare.totalRs / splitCount);
    await ride.save();
    res.json({ ok: true, fare: ride.fare });
  });

  // Rider ticks off safety-verification points (plate match, photo match) before OTP unlocks the ride
  router.post("/:id/verify-checklist", async (req, res) => {
    const { plateConfirmed, photoConfirmed } = req.body;
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { $set: {
          ...(typeof plateConfirmed === "boolean" && { "verification.plateConfirmed": plateConfirmed }),
          ...(typeof photoConfirmed === "boolean" && { "verification.photoConfirmed": photoConfirmed }),
        } },
      { new: true, returnDocument: "after" }
    );
    if (!ride) return res.status(404).json({ error: "ride not found" });
    res.json({ ok: true, verification: ride.verification });
  });

  router.post("/:id/verify-otp", async (req, res) => {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "ride not found" });
    if (!ride.verification?.plateConfirmed || !ride.verification?.photoConfirmed) {
      return res.status(412).json({
        ok: false,
        error: "the rider hasn't confirmed the plate and photo match yet — ask them to check both boxes in their app first",
      });
    }
    if (req.body.otp !== ride.otp) {
      return res.status(401).json({ ok: false, error: "OTP mismatch" });
    }
    ride.verification.otpConfirmed = true;
    ride.status = "in_progress";
    ride.startedAt = new Date();
    await ride.save();
    io.to(ride.id).emit("ride:status", { rideId: ride.id, status: ride.status });
    res.json({ ok: true, status: ride.status });
  });

  router.post("/:id/status", async (req, res) => {
    const allowed = ["requested", "driver_en_route", "arrived", "in_progress", "completed", "cancelled"];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ error: `status must be one of ${allowed.join(", ")}` });
    }
    const extra = {};
    if (req.body.status === "arrived") extra.arrivedAt = new Date();
    if (req.body.status === "completed") extra.completedAt = new Date();

    const ride = await Ride.findByIdAndUpdate(req.params.id, { status: req.body.status, ...extra }, { new: true, returnDocument: "after" });
    if (!ride) return res.status(404).json({ error: "ride not found" });
    io.to(ride.id).emit("ride:status", { rideId: ride.id, status: ride.status });

    // bump the driver's ride count once a trip completes, feeding next Bayesian trust calc
    if (req.body.status === "completed") {
      await Driver.findOneAndUpdate({ driverId: ride.driverId }, { $inc: { rideCount: 1 } });
    }
    res.json({ ok: true, status: ride.status });
  });

  router.post("/:id/rating", async (req, res) => {
    const { stars, tags = [], review } = req.body;
    const ride = await Ride.findByIdAndUpdate(req.params.id, { rating: { stars, tags, review } }, { new: true, returnDocument: "after" });
    if (!ride) return res.status(404).json({ error: "ride not found" });

    // update driver's running rating average
    const driver = await Driver.findOne({ driverId: ride.driverId });
    if (driver) {
      const newRating = (driver.rating * driver.rideCount + stars) / (driver.rideCount + 1);
      driver.rating = Math.round(newRating * 100) / 100;
      await driver.save();
    }
    res.json({ ok: true });
  });

  // Driver rates the rider, post-trip — the symmetric review, so trust flows both ways
  router.post("/:id/rider-rating", async (req, res) => {
    const { stars, tags = [], review } = req.body;
    const ride = await Ride.findByIdAndUpdate(req.params.id, { riderRating: { stars, tags, review } }, { new: true, returnDocument: "after" });
    if (!ride) return res.status(404).json({ error: "ride not found" });

    const rider = await Rider.findOne({ riderId: ride.riderId });
    if (rider) {
      const newRating = (rider.rating * rider.rideCount + stars) / (rider.rideCount + 1);
      rider.rating = Math.round(newRating * 100) / 100;
      await rider.save();
    }
    res.json({ ok: true });
  });

  // SOS — logs + broadcasts; wire to Twilio/MSG91/WhatsApp Business API for a real alert
  router.post("/:id/sos", async (req, res) => {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "ride not found" });
    console.warn(`[SOS] ride=${ride.id} rider=${ride.riderId} location=`, ride.lastLocation);
    io.to(ride.id).emit("ride:sos", { rideId: ride.id, location: ride.lastLocation, ts: Date.now() });
    res.json({ ok: true, notified: true });
  });

  return router;
};
