import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TrackingMap, { fetchRoute, useLiveRoute } from "../components/TrackingMap";
import { apiGet, apiPost, getSocket } from "../api/client";
import styles from "./ActiveRide.module.css";

export default function ActiveRide() {
  const { id } = useParams();
  const [ride, setRide] = useState(null);
  const [driver, setDriver] = useState(null);
  const [carPos, setCarPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [tripRouteCoords, setTripRouteCoords] = useState([]);
  const [error, setError] = useState(null);
  const [stars, setStars] = useState(0);
  const [ratingTags, setRatingTags] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [splitCount, setSplitCount] = useState(1);
  const [payError, setPayError] = useState(null);
  const [paying, setPaying] = useState(false);

  // Load ride + driver details
  useEffect(() => {
    apiGet(`/api/rides/${id}`)
      .then((r) => {
        setRide(r);
        setCarPos(r.lastLocation?.lat ? r.lastLocation : null);
        return apiGet(`/api/drivers/${r.driverId}`);
      })
      .then(setDriver)
      .catch(() => setError("Couldn't load this ride. Make sure the server is running and this ride ID exists."));
  }, [id]);

  useEffect(() => {
    if (ride?.fare?.splitCount) setSplitCount(ride.fare.splitCount);
  }, [ride?.fare?.splitCount]);

  // Join the ride's Socket.io room for live position + status updates (our own real-time channel)
  useEffect(() => {
    const socket = getSocket();
    socket.emit("ride:join", id);
    socket.on("location:update", (loc) => setCarPos({ lat: loc.lat, lng: loc.lng }));
    socket.on("ride:status", (s) => setRide((r) => (r ? { ...r, status: s.status } : r)));
    socket.on("ride:sos", () => alert("SOS triggered on this ride"));
    return () => {
      socket.off("location:update");
      socket.off("ride:status");
      socket.off("ride:sos");
    };
  }, [id]);

  // Fetch the road-snapped route once we know both the driver's start point and pickup
  useEffect(() => {
    if (!ride || !driver?.homeBase) return;
    fetchRoute(driver.homeBase, ride.pickup).then(setRouteCoords);
  }, [ride?._id, driver?._id]);

  // Also fetch the full pickup-to-dropoff trip route, shown as a dashed overview line
  useEffect(() => {
    if (!ride) return;
    fetchRoute(ride.pickup, ride.dropoff).then(setTripRouteCoords);
  }, [ride?._id]);

  // Live-updating route from the car's current position to whichever point
  // matters right now — re-fetches as the car actually moves, not just once.
  const nextWaypoint = ride?.status === "in_progress" ? ride?.dropoff : ride?.pickup;
  const liveRoute = useLiveRoute(carPos, nextWaypoint);
  const displayRoute = liveRoute.length > 1 ? liveRoute : routeCoords;

  async function toggleCheck(key) {
    const next = { ...ride.verification, [key]: !ride.verification?.[key] };
    setRide((r) => ({ ...r, verification: next }));
    try {
      await apiPost(`/api/rides/${id}/verify-checklist`, { [key]: next[key] });
    } catch { /* best-effort, UI already reflects the toggle */ }
  }

  async function endRide() {
    await apiPost(`/api/rides/${id}/status`, { status: "completed" });
    setRide((r) => ({ ...r, status: "completed" }));
  }

  async function sendSos() {
    await apiPost(`/api/rides/${id}/sos`, {});
  }

  async function updateSplit(count) {
    setSplitCount(count);
    try {
      const res = await apiPost(`/api/rides/${id}/split`, { splitCount: count });
      setRide((r) => ({ ...r, fare: res.fare }));
    } catch { /* keep the UI value even if the save fails; user can retry by nudging the stepper */ }
  }

  async function payCash() {
    setPayError(null);
    try {
      const res = await apiPost(`/api/payments/cash/${id}`, {});
      setRide((r) => ({ ...r, fare: res.fare }));
    } catch (err) {
      setPayError(err.message);
    }
  }

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function payRazorpay() {
    setPayError(null);
    setPaying(true);
    try {
      const order = await apiPost(`/api/payments/order/${id}`, {});
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Couldn't load Razorpay's checkout script — check your internet connection.");

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "SYNC Carpool",
        description: `Ride ${ride.pickupLabel} → ${ride.dropoffLabel}`,
        theme: { color: "#0167BC" },
        handler: async (response) => {
          try {
            const verify = await apiPost("/api/payments/verify", {
              rideId: id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setRide((r) => ({ ...r, fare: verify.fare }));
          } catch (err) {
            setPayError(err.message);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPaying(false);
    }
  }

  async function cancelRide() {
    if (!confirm("Cancel this ride?")) return;
    await apiPost(`/api/rides/${id}/status`, { status: "cancelled" });
    setRide((r) => ({ ...r, status: "cancelled" }));
  }

  function toggleTag(tag) {
    setRatingTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  async function submitRating() {
    try {
      await apiPost(`/api/rides/${id}/rating`, { stars, tags: ratingTags, review: reviewText });
      setRatingSubmitted(true);
    } catch {
      setError("Couldn't submit your rating — the server may not be running.");
    }
  }

  if (error) return <div className="container" style={{ padding: 60 }}><p className={styles.err}>{error}</p></div>;
  if (!ride) return <div className="container" style={{ padding: 60 }}><p>Loading your ride…</p></div>;

  const checklistDone = ride.verification?.plateConfirmed && ride.verification?.photoConfirmed;

  return (
    <div className={styles.wrap}>
      <div className={`${styles.roleBanner} ${styles.roleBannerRider}`}>👤 You're viewing this ride as the RIDER — waiting on / tracking your driver</div>
      {/* ---------- Map ---------- */}
      <div className={styles.mapCol}>
        <TrackingMap pickup={ride.pickup} dropoff={ride.dropoff} carPos={carPos} routeCoords={displayRoute} tripRouteCoords={tripRouteCoords} />
      </div>

      {/* ---------- Info panel ---------- */}
      <div className={styles.infoCol}>
        <div className={styles.statusBar}>
          <span className={styles.statusPill}>{ride.status.replace(/_/g, " ")}</span>
          <button className="btn btn-sm" style={{ borderColor: "#D8412E", color: "#D8412E", background: "#FBEAE7" }} onClick={sendSos}>SOS</button>
        </div>

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h4 className={styles.cardTitle}>Your ride</h4>
          <Row k="Pickup" v={ride.pickupLabel || `${ride.pickup.lat.toFixed(4)}, ${ride.pickup.lng.toFixed(4)}`} />
          <Row k="Drop-off" v={ride.dropoffLabel} />
          <Row k="Rider" v={ride.riderId} />
          {typeof ride.compatibilityScore === "number" && <Row k="Match score" v={`${Math.round(ride.compatibilityScore * 100)}%`} />}
        </div>

        {driver && (
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <h4 className={styles.cardTitle}>Your driver</h4>
            <div className={styles.driverRow}>
              <div className={styles.avatar}>
                {driver.profilePhoto ? <img src={driver.profilePhoto} alt="" /> : driver.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.driverName}>{driver.name}</div>
                <div className={styles.driverMeta}>★ {driver.rating} · {driver.rideCount} rides · {driver.vehicle}</div>
              </div>
              {driver.phone && (
                <a className={styles.callBtn} href={`tel:+91${driver.phone}`} title={`Call ${driver.name}`}>📞 Call</a>
              )}
            </div>
            <Row k="Plate number" v={driver.plateNumber} bold />
          </div>
        )}

        {ride.fare?.totalRs && (
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <h4 className={styles.cardTitle}>Fare</h4>
            <Row k="Trip distance" v={typeof ride.distanceKm === "number" ? `${ride.distanceKm} km` : "—"} />
            <Row k="Total fare" v={`₹${ride.fare.totalRs}`} />
            <div className={styles.splitRow}>
              <span className={styles.rowK}>Splitting between</span>
              <div className={styles.stepper}>
                <button type="button" className={styles.stepBtn} onClick={() => updateSplit(Math.max(1, splitCount - 1))}>−</button>
                <span>{splitCount} {splitCount === 1 ? "person" : "people"}</span>
                <button type="button" className={styles.stepBtn} onClick={() => updateSplit(splitCount + 1)}>+</button>
              </div>
            </div>
            <Row k="Your share" v={`₹${ride.fare.perRiderRs}`} bold />

            {ride.fare.status === "paid" ? (
              <p className={styles.savedLine} style={{ marginTop: 10 }}>
                Paid via {ride.fare.method === "razorpay" ? "Razorpay" : "cash"} ✓
              </p>
            ) : (
              <>
                {payError && <p className={styles.err}>{payError}</p>}
                <div className={styles.payRow}>
                  <button className="btn btn-primary" disabled={paying} onClick={payRazorpay}>
                    {paying ? "Opening…" : "Pay online (UPI / card)"}
                  </button>
                  <button className="btn btn-outline" onClick={payCash}>Pay with cash</button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h4 className={styles.cardTitle}>Before you get in</h4>
          <Check label={`Plate matches: ${driver?.plateNumber || "—"}`} checked={!!ride.verification?.plateConfirmed} onToggle={() => toggleCheck("plateConfirmed")} />
          <Check label="Driver photo matches the app" checked={!!ride.verification?.photoConfirmed} onToggle={() => toggleCheck("photoConfirmed")} />
          {!checklistDone && <p className={styles.hint}>Confirm both points above before your driver can start the ride.</p>}
        </div>

        {(ride.status === "requested" || ride.status === "driver_en_route") && (
          <button className="btn btn-outline btn-block" style={{ marginBottom: 16, borderColor: "#D8412E", color: "#D8412E" }} onClick={cancelRide}>
            Cancel this ride
          </button>
        )}

        {ride.status !== "completed" && ride.status !== "cancelled" && (
          <div className="card" style={{ padding: 18 }}>
            <h4 className={styles.cardTitle}>{ride.status === "in_progress" ? "Ride in progress" : "Share this code with your driver"}</h4>
            {ride.status === "in_progress" ? (
              <>
                <p className={styles.hint} style={{ marginBottom: 12 }}>Heading to {ride.dropoffLabel}.</p>
                <button className="btn btn-primary btn-block" onClick={endRide}>End ride</button>
              </>
            ) : (
              <>
                <div className={styles.otpDisplay}>{ride.otp}</div>
                <p className={styles.hint}>
                  Tell your driver this code once you're in the car — they'll enter it on their
                  end to start the trip. {!checklistDone && "Confirm both points above first."}
                </p>
              </>
            )}
          </div>
        )}

        {ride.status === "completed" && (
          <div className="card" style={{ padding: 18 }}>
            <h4 className={styles.cardTitle}>Rate your ride</h4>
            {ratingSubmitted ? (
              <p className={styles.hint}>Thanks for the feedback — it's factored into {driver?.name || "your driver"}'s trust score.</p>
            ) : (
              <>
                <div className={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= stars ? styles.starOn : styles.star} onClick={() => setStars(n)}>★</span>
                  ))}
                </div>
                <div className={styles.tagRow}>
                  {["Punctual", "Safe driving", "Friendly", "Clean vehicle"].map((tag) => (
                    <span key={tag} className={`chip ${ratingTags.includes(tag) ? "on" : ""}`} onClick={() => toggleTag(tag)}>{tag}</span>
                  ))}
                </div>
                <textarea
                  className={styles.reviewInput}
                  placeholder="Add a note about your ride (optional)"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                />
                <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={stars === 0} onClick={submitRating}>
                  Submit rating
                </button>
              </>
            )}
          </div>
        )}

        {ride.status === "cancelled" && (
          <div className="card" style={{ padding: 18 }}>
            <h4 className={styles.cardTitle}>Ride cancelled</h4>
            <p className={styles.hint}>This trip was cancelled before it started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, bold }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowK}>{k}</span>
      <span className={bold ? styles.rowVBold : styles.rowV}>{v}</span>
    </div>
  );
}
function Check({ label, checked, onToggle }) {
  return (
    <label className={styles.checkRow}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span>{label}</span>
    </label>
  );
}
