import { useEffect, useState } from "react";
import { useAuth } from "../api/AuthContext";
import { authGet, authPost, authDelete, authPatch } from "../api/client";
import { PICKUP_POINTS, MIET, coordsFor, labelFor } from "../constants/places";
import styles from "./RecurringRides.module.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function RecurringRides() {
  const { user, token } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [direction, setDirection] = useState("to_miet");
  const [otherPoint, setOtherPoint] = useState(PICKUP_POINTS[0].value);
  const [depTime, setDepTime] = useState("08:15");
  const [days, setDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function load() {
    authGet("/api/recurring/mine", token).then(setSchedules).catch(() => {});
  }

  useEffect(() => {
    if (user?.role === "rider") load();
  }, [user, token]);

  function toggleDay(d) {
    setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    if (days.length === 0) { setError("Pick at least one day."); return; }
    setLoading(true);
    const isToMiet = direction === "to_miet";
    const trip = isToMiet
      ? { pickup: coordsFor(otherPoint), dropoff: { lat: MIET.lat, lng: MIET.lng }, pickupLabel: labelFor(otherPoint), dropoffLabel: MIET.label }
      : { pickup: { lat: MIET.lat, lng: MIET.lng }, dropoff: coordsFor(otherPoint), pickupLabel: MIET.label, dropoffLabel: labelFor(otherPoint) };
    try {
      await authPost("/api/recurring", { ...trip, depTime, days }, token);
      load();
    } catch (err) {
      setError(err.message || "Couldn't create the schedule.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(s) {
    await authPatch(`/api/recurring/${s._id}/active`, { isActive: !s.isActive }, token);
    load();
  }
  async function remove(s) {
    if (!confirm("Delete this recurring schedule?")) return;
    await authDelete(`/api/recurring/${s._id}`, token);
    load();
  }

  if (!user || user.role !== "rider") {
    return <div className="container" style={{ padding: 60 }}><p>Sign in as a rider to set up recurring rides.</p></div>;
  }

  return (
    <div className="container" style={{ padding: "44px 0 70px", maxWidth: 720 }}>
      <h1 className={styles.h1}>Recurring rides</h1>
      <p className={styles.sub}>
        Set a schedule once — a background job auto-books your best match every day it's due,
        the same matching engine as a manual request.
      </p>

      <form className={`card ${styles.card}`} onSubmit={handleCreate}>
        <div className="field">
          <label>Trip direction</label>
          <div className="chip-row">
            <div className={`chip ${direction === "to_miet" ? "on" : ""}`} onClick={() => setDirection("to_miet")}>To MIET</div>
            <div className={`chip ${direction === "from_miet" ? "on" : ""}`} onClick={() => setDirection("from_miet")}>From MIET</div>
          </div>
        </div>
        <div className={styles.row2}>
          <div className="field">
            <label>{direction === "to_miet" ? "Pickup point" : "Destination"}</label>
            <select value={otherPoint} onChange={(e) => setOtherPoint(e.target.value)}>
              {PICKUP_POINTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Departure time</label>
            <input type="time" value={depTime} onChange={(e) => setDepTime(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Repeats on</label>
          <div className="chip-row">
            {DAYS.map((d) => (
              <div key={d} className={`chip ${days.includes(d) ? "on" : ""}`} onClick={() => toggleDay(d)}>{d}</div>
            ))}
          </div>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button className="btn btn-primary" disabled={loading}>{loading ? "Saving…" : "Create schedule"}</button>
      </form>

      <h3 className={styles.sectionTitle}>Your schedules</h3>
      {schedules.length === 0 && <p className={styles.empty}>No recurring schedules yet.</p>}
      {schedules.map((s) => (
        <div key={s._id} className={`card ${styles.scheduleCard}`}>
          <div>
            <div className={styles.route}>{s.pickupLabel} → {s.dropoffLabel}</div>
            <div className={styles.meta}>{s.depTime} · {s.days.join(", ")}</div>
          </div>
          <div className={styles.scheduleActions}>
            <button className={`btn btn-sm ${s.isActive ? "btn-primary" : "btn-outline"}`} onClick={() => toggleActive(s)}>
              {s.isActive ? "Active" : "Paused"}
            </button>
            <button className="btn btn-outline btn-sm" style={{ borderColor: "#D8412E", color: "#D8412E" }} onClick={() => remove(s)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
