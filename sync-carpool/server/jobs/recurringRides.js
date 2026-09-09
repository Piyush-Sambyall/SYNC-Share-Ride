const cron = require("node-cron");
const crypto = require("crypto");
const RecurringRide = require("../models/RecurringRide");
const Ride = require("../models/Ride");
const Driver = require("../models/Driver");
const { scorePair, haversineKm } = require("../engine/compatibilityModel");

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

/**
 * Runs every minute, checking every active recurring schedule against the
 * current day/time. When a schedule matches, it runs the same matching
 * engine used for a manual request, books the best available driver, and
 * creates a real Ride document -- this is a genuine auto-booking job, not
 * just a stored preference the rider re-enters every morning.
 *
 * `lastTriggeredDate` on each schedule prevents it from firing twice in
 * the same day if the server restarts or the minute check overlaps.
 */
function startRecurringRideCron(io) {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const today = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayAbbr = DAY_ABBR[now.getDay()];

      const due = await RecurringRide.find({
        isActive: true,
        days: todayAbbr,
        depTime: hhmm,
        lastTriggeredDate: { $ne: today },
      });

      for (const schedule of due) {
        const query = { isOnline: true };
        if (schedule.prefs?.evOnly) query.isEV = true;
        const drivers = await Driver.find(query);
        if (drivers.length === 0) continue; // no one online right now, skip silently -- rider can still book manually

        const [h, m] = schedule.depTime.split(":").map(Number);
        const depMin = h * 60 + m;
        const rider = { pickup: [schedule.pickup.lat, schedule.pickup.lng], depMin, prefs: schedule.prefs, gender: undefined };

        let best = null;
        for (const d of drivers) {
          const driverInput = {
            homeBase: [d.homeBase.lat, d.homeBase.lng],
            rating: d.rating, rideCount: d.rideCount, ac: d.ac, smoking: d.smoking,
            gender: d.gender, typicalDepartureMinute: d.typicalDepartureMinute,
          };
          const { score } = scorePair(rider, driverInput, [schedule.dropoff.lat, schedule.dropoff.lng]);
          if (!best || score > best.score) best = { driver: d, score };
        }
        if (!best) continue;

        const { distanceKm, totalRs } = estimateFare(schedule.pickup, schedule.dropoff);

        const ride = await Ride.create({
          riderId: schedule.riderId,
          driverId: best.driver.driverId,
          pickup: schedule.pickup, dropoff: schedule.dropoff,
          pickupLabel: schedule.pickupLabel, dropoffLabel: schedule.dropoffLabel,
          otp: makeOtp(), status: "driver_en_route",
          compatibilityScore: best.score,
          recurringRideId: schedule._id,
          distanceKm,
          fare: { totalRs, splitCount: 1, perRiderRs: totalRs, status: "pending" },
        });

        schedule.lastTriggeredDate = today;
        await schedule.save();

        io.emit("recurring:booked", { riderId: schedule.riderId, rideId: ride._id, driverName: best.driver.name });
        console.log(`[recurring] auto-booked ride ${ride._id} for ${schedule.riderId} with ${best.driver.name}`);
      }
    } catch (err) {
      console.error("[recurring] cron tick failed:", err.message);
    }
  });

  console.log("Recurring-ride cron started (checks every minute).");
}

module.exports = { startRecurringRideCron };
