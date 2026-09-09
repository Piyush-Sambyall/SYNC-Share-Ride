import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import { authGet, authPatch, apiGet } from "../api/client";
import styles from "./DriverDashboard.module.css";

export default function DriverDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [rides, setRides] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "driver") return;
    authGet("/api/drivers/me", token).then(setDriver).catch(() => setError("Couldn't load your profile."));
    apiGet(`/api/rides/for-driver/${user.driverId}`).then(setRides).catch(() => {});
  }, [user, token]);

  async function toggleOnline() {
    try {
      const updated = await authPatch("/api/drivers/me/online", { isOnline: !driver.isOnline }, token);
      setDriver(updated);
    } catch {
      setError("Couldn't update your online status.");
    }
  }

  if (!user || user.role !== "driver") {
    return <div className="container" style={{ padding: 60 }}><p>Sign in as a driver to see this page.</p></div>;
  }

  const active = rides.filter((r) => !["completed", "cancelled"].includes(r.status));
  const past = rides.filter((r) => ["completed", "cancelled"].includes(r.status));

  return (
    <div className="container" style={{ padding: "40px 0 70px" }}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.h1}>Welcome, {user.name}</h1>
          <p className={styles.sub}>{driver?.driverId}</p>
        </div>
        {driver && (
          <button className={`btn ${driver.isOnline ? "btn-primary" : "btn-outline"}`} onClick={toggleOnline}>
            {driver.isOnline ? "You're online" : "Go online"}
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <h3 className={styles.sectionTitle}>Active rides</h3>
      {active.length === 0 && <p className={styles.empty}>No active rides right now. Go online so riders can match with you.</p>}
      {active.map((r) => (
        <div key={r._id} className={`card ${styles.rideCard}`}>
          <div>
            <div className={styles.route}>{r.pickupLabel} → {r.dropoffLabel}</div>
            <div className={styles.meta}>Status: {r.status.replace(/_/g, " ")} · Rider {r.riderId}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/drive/${r._id}`)}>Open ride</button>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Past rides</h3>
          {past.map((r) => (
            <div key={r._id} className={`card ${styles.rideCard}`}>
              <div>
                <div className={styles.route}>{r.pickupLabel} → {r.dropoffLabel}</div>
                <div className={styles.meta}>{r.status} {r.completedAt ? `· ${new Date(r.completedAt).toLocaleString()}` : ""}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
