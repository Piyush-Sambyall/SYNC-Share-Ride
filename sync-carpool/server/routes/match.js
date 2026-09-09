const express = require("express");
const router = express.Router();
const Driver = require("../models/Driver");
const { scorePair } = require("../engine/compatibilityModel");
const { hungarian } = require("../engine/hungarian");

// Never send these to a rider who's just browsing matches — passwordHash
// obviously, but also contact/identity/payment fields that should only
// surface once a ride is actually booked (and even then, phone is the only
// one exposed — see routes/drivers.js's PUBLIC_FIELDS for the booked-ride view).
const MATCH_EXCLUDE = "-passwordHash -email -phone -altPhone -idNumber -dob -emergencyContact -licenseNumber -vehicleRcNumber -insuranceNumber -upiId";

/**
 * POST /api/match/rank
 * body: { pickup:{lat,lng}, dest:{lat,lng}, depMin, prefs, gender }
 * Returns every online driver scored + ranked against this one rider.
 */
router.post("/rank", async (req, res) => {
  try {
    const { pickup, dest, depMin, prefs = {}, gender } = req.body;
    if (!pickup || !dest || typeof depMin !== "number") {
      return res.status(400).json({ error: "pickup, dest, and depMin are required" });
    }
    const query = { isOnline: true };
    if (prefs.evOnly) query.isEV = true; // hard filter, not part of the trained score
    const drivers = await Driver.find(query).select(MATCH_EXCLUDE);
    const rider = { pickup: [pickup.lat, pickup.lng], depMin, prefs, gender };

    const ranked = drivers
      .map((d) => {
        const driver = {
          homeBase: [d.homeBase.lat, d.homeBase.lng],
          rating: d.rating,
          rideCount: d.rideCount,
          ac: d.ac,
          smoking: d.smoking,
          gender: d.gender,
          typicalDepartureMinute: d.typicalDepartureMinute,
        };
        const { score, feats } = scorePair(rider, driver, [dest.lat, dest.lng]);
        return { driver: d, score, feats };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ count: ranked.length, ranked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/match/batch
 * body: { riders: [{id, pickup, depMin, prefs, gender}], dest:{lat,lng} }
 * Optimally assigns each rider to a distinct online driver using the
 * Hungarian algorithm, maximising TOTAL compatibility across the batch.
 */
router.post("/batch", async (req, res) => {
  try {
    const { riders, dest } = req.body;
    if (!Array.isArray(riders) || riders.length === 0 || !dest) {
      return res.status(400).json({ error: "riders[] and dest are required" });
    }
    const drivers = await Driver.find({ isOnline: true }).select(MATCH_EXCLUDE).limit(riders.length);
    if (drivers.length < riders.length) {
      return res.status(400).json({ error: "not enough online drivers for this batch" });
    }

    const scoreMatrix = riders.map((r) =>
      drivers.map((d) => {
        const driver = {
          homeBase: [d.homeBase.lat, d.homeBase.lng],
          rating: d.rating,
          rideCount: d.rideCount,
          ac: d.ac,
          smoking: d.smoking,
          gender: d.gender,
          typicalDepartureMinute: d.typicalDepartureMinute,
        };
        const rider = { pickup: [r.pickup.lat, r.pickup.lng], depMin: r.depMin, prefs: r.prefs, gender: r.gender };
        return scorePair(rider, driver, [dest.lat, dest.lng]).score;
      })
    );

    const costMatrix = scoreMatrix.map((row) => row.map((s) => 1 - s));
    const assignment = hungarian(costMatrix); // assignment[riderIdx] = driverIdx

    const totalScore = assignment.reduce((acc, dIdx, i) => acc + scoreMatrix[i][dIdx], 0);

    const pairs = riders.map((r, i) => ({
      riderId: r.id,
      driver: drivers[assignment[i]],
      score: scoreMatrix[i][assignment[i]],
    }));

    res.json({ pairs, totalScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
