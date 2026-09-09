import { useEffect, useState } from "react";
import { useAuth } from "../api/AuthContext";
import { authGet } from "../api/client";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState("riders");
  const [riders, setRiders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    Promise.all([
      authGet("/api/admin/summary", token),
      authGet("/api/admin/riders", token),
      authGet("/api/admin/drivers", token),
      authGet("/api/admin/rides", token),
    ])
      .then(([s, r, d, rd]) => { setSummary(s); setRiders(r); setDrivers(d); setRides(rd); })
      .catch(() => setError("Couldn't load admin data. Make sure you're signed in as an admin."));
  }, [user, token]);

  if (!user || user.role !== "admin") {
    return <div className="container" style={{ padding: 60 }}><p>Sign in with an admin account to see this page.</p></div>;
  }

  return (
    <div className="container" style={{ padding: "40px 0 80px" }}>
      <h1 className={styles.h1}>Admin</h1>
      {error && <p className={styles.error}>{error}</p>}

      {summary && (
        <div className={styles.statGrid}>
          <Stat k={summary.riderCount} v="riders" />
          <Stat k={summary.driverCount} v="drivers" />
          <Stat k={summary.onlineDrivers} v="drivers online" />
          <Stat k={summary.rideCount} v="total rides" />
          <Stat k={summary.completedRides} v="completed rides" />
          <Stat k={summary.avgDriverRating ? `${summary.avgDriverRating}★` : "—"} v="avg. driver rating" />
        </div>
      )}

      <div className={styles.tabs}>
        <button className={tab === "riders" ? styles.tabActive : styles.tab} onClick={() => setTab("riders")}>Riders ({riders.length})</button>
        <button className={tab === "drivers" ? styles.tabActive : styles.tab} onClick={() => setTab("drivers")}>Drivers ({drivers.length})</button>
        <button className={tab === "rides" ? styles.tabActive : styles.tab} onClick={() => setTab("rides")}>Rides ({rides.length})</button>
      </div>

      {tab === "riders" && <Table rows={riders} columns={["riderId", "name", "email", "phone", "gender", "rating"]} />}
      {tab === "drivers" && <Table rows={drivers} columns={["driverId", "name", "email", "plateNumber", "vehicle", "isOnline", "rating"]} />}
      {tab === "rides" && <Table rows={rides} columns={["riderId", "driverId", "pickupLabel", "dropoffLabel", "status", "createdAt"]} />}
    </div>
  );
}

function Stat({ k, v }) {
  return <div className={styles.stat}><b>{k}</b><span>{v}</span></div>;
}

function Table({ rows, columns }) {
  if (rows.length === 0) return <p className={styles.empty}>Nothing here yet.</p>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id}>
              {columns.map((c) => <td key={c}>{formatCell(row[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v) {
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString();
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}
