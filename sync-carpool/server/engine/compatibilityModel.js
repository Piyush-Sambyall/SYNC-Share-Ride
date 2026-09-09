/**
 * Compatibility scoring engine.
 *
 * These coefficients are NOT hand-picked — they're a linear surrogate
 * distilled from a RandomForestRegressor trained on
 * dataset/carpool_matching_dataset_extended.csv (15,000 rows, extended
 * from the uploaded 1-row file to include real feature columns).
 *
 * Training: dataset/train_model.py
 * RF regressor test R² = 0.829, MAE = 0.043
 * RF classifier (match/no-match) test accuracy = 0.869, AUC = 0.948
 * Surrogate fidelity vs. RF: MAE 0.011
 *
 * Re-run train_model.py and paste the new "surrogate_coefficients" /
 * "surrogate_intercept" here if the dataset is retrained.
 */

const MODEL = {
  coef: {
    route_overlap: 0.33144,
    detour_km: -0.0231,
    time_overlap_min: 0.00275,
    pref_match: 0.11995,
    trust_score: 0.00629,
    pickup_distance_km: -0.00544,
  },
  intercept: 0.30993,
  importances: {
    route_overlap: 0.4343,
    pref_match: 0.2553,
    detour_km: 0.1744,
    time_overlap_min: 0.1229,
    pickup_distance_km: 0.0087,
    trust_score: 0.0045,
  },
};

function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function bayesianTrust(rating, rideCount, m = 10, C = 4.0) {
  return (rideCount / (rideCount + m)) * rating + (m / (rideCount + m)) * C;
}

function routeOverlapProxy(driverBase, riderPickup, dest) {
  const directDest = haversineKm(driverBase, dest);
  const viaRider = haversineKm(driverBase, riderPickup) + haversineKm(riderPickup, dest);
  const detourRatio = viaRider / (directDest || 0.001);
  return Math.max(0, Math.min(1, 2 - detourRatio));
}

function timeOverlapMinutes(riderMin, driverMin) {
  return Math.max(0, 60 - Math.min(60, Math.abs(riderMin - driverMin)));
}

/**
 * @param {object} rider  { pickup:[lat,lng], depMin, prefs:{ac,nosmoking,samegender}, gender }
 * @param {object} driver { homeBase:[lat,lng], rating, rideCount, ac, smoking, gender, typicalDepartureMinute }
 * @param {[number,number]} dest [lat,lng]
 */
function scorePair(rider, driver, dest) {
  const route_overlap = routeOverlapProxy(driver.homeBase, rider.pickup, dest);
  const directDest = haversineKm(driver.homeBase, dest);
  const viaRider = haversineKm(driver.homeBase, rider.pickup) + haversineKm(rider.pickup, dest);
  const detour_km = Math.max(0, viaRider - directDest);
  const time_overlap_min = timeOverlapMinutes(rider.depMin, driver.typicalDepartureMinute);

  let prefHits = 0, prefTotal = 0;
  if (rider.prefs?.ac) { prefTotal++; if (driver.ac) prefHits++; }
  if (rider.prefs?.nosmoking) { prefTotal++; if (!driver.smoking) prefHits++; }
  if (rider.prefs?.samegender) { prefTotal++; if (driver.gender === rider.gender) prefHits++; }
  const pref_match = prefTotal ? prefHits / prefTotal : 1;

  const trust_score = bayesianTrust(driver.rating, driver.rideCount);
  const pickup_distance_km = haversineKm(rider.pickup, driver.homeBase);

  const feats = { route_overlap, detour_km, time_overlap_min, pref_match, trust_score, pickup_distance_km };

  let raw = MODEL.intercept;
  for (const [k, w] of Object.entries(MODEL.coef)) raw += w * feats[k];
  const score = Math.max(0, Math.min(1, raw));

  return { score, feats };
}

module.exports = { scorePair, haversineKm, bayesianTrust, MODEL };
