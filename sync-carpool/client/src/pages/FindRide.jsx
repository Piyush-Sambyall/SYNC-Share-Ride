import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RideForm from "../components/RideForm";
import MatchCard from "../components/MatchCard";
import { apiPost } from "../api/client";
import { useAuth } from "../api/AuthContext";
import { coordsFor, labelFor, MIET } from "../constants/places";
import styles from "./FindRide.module.css";

export default function FindRide() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastTrip, setLastTrip] = useState(null); // { pickup, dest, pickupLabel, dropoffLabel }

  async function handleSubmit({ direction, otherPoint, time, prefs }) {
    setLoading(true);
    setError(null);
    setMatches(null);

    const isToMiet = direction === "to_miet";
    const trip = isToMiet
      ? { pickup: coordsFor(otherPoint), dest: { lat: MIET.lat, lng: MIET.lng }, pickupLabel: labelFor(otherPoint), dropoffLabel: MIET.label }
      : { pickup: { lat: MIET.lat, lng: MIET.lng }, dest: coordsFor(otherPoint), pickupLabel: MIET.label, dropoffLabel: labelFor(otherPoint) };
    setLastTrip(trip);

    try {
      const [h, m] = time.split(":").map(Number);
      const depMin = h * 60 + m;
      const { ranked } = await apiPost("/api/match/rank", {
        pickup: trip.pickup, dest: trip.dest,
        depMin, prefs, gender: user?.gender || "M",
      });
      setMatches(ranked);
    } catch (err) {
      setError("Couldn't reach the matching API. Make sure the server is running (see README).");
    } finally {
      setLoading(false);
    }
  }

  async function handleBook(match) {
    if (!lastTrip) return;
    try {
      const ride = await apiPost("/api/rides", {
        riderId: user?.riderId || "USR_RIDER_GUEST",
        driverId: match.driver.driverId,
        pickup: lastTrip.pickup,
        dropoff: lastTrip.dest,
        pickupLabel: lastTrip.pickupLabel,
        dropoffLabel: lastTrip.dropoffLabel,
        compatibilityScore: match.score,
        scoreBreakdown: match.feats,
      });
      navigate(`/ride/${ride._id}`);
    } catch (err) {
      setError("Couldn't create the ride. Make sure the server is running.");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className="container">
        <h1 className={styles.h1}>Find your ride</h1>
        <p className={styles.sub}>Going to campus or heading home — tell us your route either way.</p>

        {!user && (
          <p className={styles.notice}>
            Booking as a guest. <a onClick={() => navigate("/signup")}>Create an account</a> to save your ride history and build a trust rating.
          </p>
        )}

        <div className={styles.grid}>
          <RideForm onSubmit={handleSubmit} />
          <div className={styles.results}>
            {loading && <p className={styles.status}>Scoring you against every driver online…</p>}
            {error && <p className={styles.error}>{error}</p>}
            {!loading && !error && !matches && (
              <p className={styles.status}>Your ranked matches will appear here.</p>
            )}
            {matches?.map((m) => (
              <MatchCard key={m.driver._id} match={m} onBook={handleBook} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
