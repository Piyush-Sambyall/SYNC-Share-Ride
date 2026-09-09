import { useEffect, useState } from "react";
import { useAuth } from "../api/AuthContext";
import { apiGet } from "../api/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import styles from "./Dashboard.module.css";

const PIE_COLORS = ["#1AA260", "#D8412E", "#9AA5AC"];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [rides, setRides] = useState([]);
  const [error, setError] = useState(null);

  const role = user?.role;
  const id = role === "driver" ? user?.driverId : user?.riderId;

  useEffect(() => {
    if (!role || role === "admin" || !id) return;
    apiGet(`/api/rides/stats/${role}/${id}`).then(setStats).catch(() => setError("Couldn't load your stats."));
    apiGet(`/api/rides/for-${role}/${id}`).then(setRides).catch(() => {});
  }, [role, id]);

  if (!user || user.role === "admin") {
    return <div className="container" style={{ padding: 60 }}><p>Sign in as a rider or driver to see your dashboard.</p></div>;
  }
  if (error) return <div className="container" style={{ padding: 60 }}><p className={styles.error}>{error}</p></div>;
  if (!stats) return <div className="container" style={{ padding: 60 }}><p>Loading your stats…</p></div>;

  const statusPie = [
    { name: "Completed", value: stats.completedRides },
    { name: "Cancelled", value: stats.cancelledRides },
    { name: "Other", value: Math.max(0, stats.totalRides - stats.completedRides - stats.cancelledRides) },
  ].filter((d) => d.value > 0);

  return (
    <div className="container" style={{ padding: "44px 0 80px" }}>
      <h1 className={styles.h1}>Your dashboard</h1>
      <p className={styles.sub}>{role === "driver" ? "As a driver" : "As a rider"} on SYNC so far.</p>

      <div className={styles.statGrid}>
        <Stat k={stats.totalRides} v="total rides" />
        <Stat k={stats.completedRides} v="completed" />
        <Stat k={`${stats.totalDistanceKm} km`} v="distance traveled" />
        <Stat k={`₹${stats.totalSpentOrEarnedRs}`} v={role === "driver" ? "earned" : "spent"} />
        <Stat k={stats.avgRating ? `${stats.avgRating}★` : "—"} v="average rating" />
        <Stat k={stats.cancelledRides} v="cancelled" />
      </div>

      <div className={styles.chartGrid}>
        <div className={`card ${styles.chartCard}`}>
          <h4 className={styles.chartTitle}>Rides per week</h4>
          {stats.ridesByWeek.length === 0 ? (
            <p className={styles.empty}>No completed rides yet — this fills in as you ride.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.ridesByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E9EF" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0167BC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`card ${styles.chartCard}`}>
          <h4 className={styles.chartTitle}>Ride outcomes</h4>
          {statusPie.length === 0 ? (
            <p className={styles.empty}>No rides yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {statusPie.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <h3 className={styles.sectionTitle}>Ride history</h3>
      {rides.length === 0 ? (
        <p className={styles.empty}>No rides yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Route</th>
                <th>Date</th>
                <th>Distance</th>
                <th>Fare</th>
                <th>Status</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((r) => (
                <tr key={r._id}>
                  <td>{r.pickupLabel} → {r.dropoffLabel}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>{typeof r.distanceKm === "number" ? `${r.distanceKm} km` : "—"}</td>
                  <td>{r.fare?.perRiderRs ? `₹${r.fare.perRiderRs}` : "—"}</td>
                  <td className={styles.statusCell}>{r.status.replace(/_/g, " ")}</td>
                  <td>{(role === "driver" ? r.rating?.stars : r.riderRating?.stars) ? `${role === "driver" ? r.rating.stars : r.riderRating.stars}★` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }) {
  return (
    <div className={styles.stat}>
      <b>{k}</b>
      <span>{v}</span>
    </div>
  );
}
