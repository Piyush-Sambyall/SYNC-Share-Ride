import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import TrackingMap, { fetchRoute, useLiveRoute } from "../components/TrackingMap";
import { apiGet, apiPost, authGet, getSocket } from "../api/client";
import { useAuth } from "../api/AuthContext";
import styles from "./ActiveRide.module.css"; // shared layout with the rider's view

export default function DriverRide() {
  const { id } = useParams();
  const { token } = useAuth();
  const [ride, setRide] = useState(null);
  const [rider, setRider] = useState(null);
  const [ownProfile, setOwnProfile] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [carPos, setCarPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState(null);
  const [stars, setStars] = useState(0);
  const [ratingTags, setRatingTags] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const watchId = useRef(null);

  useEffect(() => {
    apiGet(`/api/rides/${id}`)
      .then((r) => {
        setRide(r);
        setCarPos(r.lastLocation?.lat ? r.lastLocation : null);
        apiGet(`/api/riders/${r.riderId}`).then(setRider).catch(() => {});
        return fetchRoute(r.pickup, r.dropoff);
      })
      .then(setRouteCoords)
      .catch(() => setError("Couldn't load this ride."));

    if (token) authGet("/api/drivers/me", token).then(setOwnProfile).catch(() => {});

    const socket = getSocket();
    socket.emit("ride:join", id);
    socket.on("ride:status", (s) => setRide((r) => (r ? { ...r, status: s.status } : r)));
    return () => {
      socket.off("ride:status");
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [id]);

  function startSharing() {
    if (!navigator.geolocation) {
      setError("This browser doesn't support geolocation — falling back to a simulated route.");
      return simulateMovement();
    }
    setSharing(true);
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, speed, heading } = pos.coords;
        setCarPos({ lat, lng });
        try {
          await apiPost(`/api/rides/${id}/location`, { lat, lng, heading: heading || 0, speedKmh: (speed || 0) * 3.6 });
        } catch { /* keep watching even if one ping fails */ }
      },
      () => { setError("Location permission denied — falling back to a simulated route so the demo still works."); simulateMovement(); },
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  }

  function simulateMovement() {
    setSharing(true);
    if (!ride) return;
    const from = { lat: ride.pickup.lat + 0.01, lng: ride.pickup.lng + 0.01 };
    const to = ride.pickup;
    let t = 0;
    const iv = setInterval(async () => {
      t += 0.03;
      if (t >= 1) return clearInterval(iv);
      const lat = from.lat + (to.lat - from.lat) * t;
      const lng = from.lng + (to.lng - from.lng) * t;
      setCarPos({ lat, lng });
      try { await apiPost(`/api/rides/${id}/location`, { lat, lng }); } catch {}
    }, 1000);
  }

  function stopSharing() {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    setSharing(false);
  }

  async function markArrived() {
    await apiPost(`/api/rides/${id}/status`, { status: "arrived" });
    setRide((r) => ({ ...r, status: "arrived" }));
  }

  async function submitOtp() {
    setOtpError(null);
    try {
      const res = await apiPost(`/api/rides/${id}/verify-otp`, { otp: otpInput });
      setRide((r) => ({ ...r, status: res.status }));
    } catch (err) {
      setOtpError(err.message);
    }
  }
  async function endRide() {
    stopSharing();
    await apiPost(`/api/rides/${id}/status`, { status: "completed" });
    setRide((r) => ({ ...r, status: "completed" }));
  }

  function toggleTag(tag) {
    setRatingTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  async function submitRiderRating() {
    try {
      await apiPost(`/api/rides/${id}/rider-rating`, { stars, tags: ratingTags, review: reviewText });
      setRatingSubmitted(true);
    } catch {
      setError("Couldn't submit your rating — the server may not be running.");
    }
  }

  const nextWaypoint = ride?.status === "in_progress" ? ride?.dropoff : ride?.pickup;
  const liveRoute = useLiveRoute(carPos, nextWaypoint);
  const displayRoute = liveRoute.length > 1 ? liveRoute : routeCoords;

  if (error && !ride) return <div className="container" style={{ padding: 60 }}><p className={styles.err}>{error}</p></div>;
  if (!ride) return <div className="container" style={{ padding: 60 }}><p>Loading ride…</p></div>;

  return (
    <div className={styles.wrap}>
      <div className={`${styles.roleBanner} ${styles.roleBannerDriver}`}>🚗 You're viewing this ride as the DRIVER — control the OTP handoff and location sharing from here</div>
      <div className={styles.mapCol}>
        <TrackingMap pickup={ride.pickup} dropoff={ride.dropoff} carPos={carPos} routeCoords={displayRoute} />
      </div>

      <div className={styles.infoCol}>
        <div className={styles.statusBar}>
          <span className={styles.statusPill}>{ride.status.replace(/_/g, " ")}</span>
        </div>

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h4 className={styles.cardTitle}>This ride</h4>
          <Row k="Pickup" v={ride.pickupLabel} />
          <Row k="Drop-off" v={ride.dropoffLabel} />
        </div>

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h4 className={styles.cardTitle}>Your rider</h4>
          {rider ? (
            <div className={styles.driverRow}>
              <div className={styles.avatar}>
                {rider.profilePhoto ? <img src={rider.profilePhoto} alt="" /> : rider.name?.split(" ").map((n) => n[0]).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.driverName}>{rider.name}</div>
                <div className={styles.driverMeta}>★ {rider.rating} · {rider.rideCount} rides</div>
              </div>
              {rider.phone && (
                <a className={styles.callBtn} href={`tel:+91${rider.phone}`} title={`Call ${rider.name}`}>📞 Call</a>
              )}
            </div>
          ) : (
            <Row k="Rider" v={ride.riderId} />
          )}
        </div>

        {ride.fare?.totalRs && (
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <h4 className={styles.cardTitle}>Fare</h4>
            <Row k="Trip distance" v={typeof ride.distanceKm === "number" ? `${ride.distanceKm} km` : "—"} />
            <Row k="Total fare" v={`₹${ride.fare.totalRs}`} bold />
            <p className={styles.hint} style={{ marginTop: 10, marginBottom: 10 }}>
              If the rider's UPI checkout isn't going through, show them this QR to scan and pay directly.
            </p>
            {ownProfile?.upiId ? (
              <button className="btn btn-outline btn-block" onClick={() => setShowQr(true)}>Show payment QR</button>
            ) : (
              <p className={styles.hint}>Add a UPI ID in your profile to enable this fallback.</p>
            )}
          </div>
        )}

        {error && <p className={styles.err}>{error}</p>}

        {ride.status !== "in_progress" && ride.status !== "completed" && (
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <h4 className={styles.cardTitle}>Start the ride</h4>
            <p className={styles.hint} style={{ marginBottom: 12 }}>
              Ask your rider for their pickup code and enter it below to begin the trip.
            </p>
            <div className={styles.verifyStatus}>
              <span className={ride.verification?.plateConfirmed ? styles.verifyOk : styles.verifyPending}>
                {ride.verification?.plateConfirmed ? "✓" : "…"} Rider confirmed plate
              </span>
              <span className={ride.verification?.photoConfirmed ? styles.verifyOk : styles.verifyPending}>
                {ride.verification?.photoConfirmed ? "✓" : "…"} Rider confirmed photo
              </span>
            </div>
            <input
              className={styles.otpInput}
              placeholder="Enter rider's 4-digit code"
              value={otpInput}
              maxLength={4}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
            />
            {otpError && <p className={styles.err}>{otpError}</p>}
            <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} disabled={otpInput.length !== 4} onClick={submitOtp}>
              Confirm &amp; start ride
            </button>
          </div>
        )}

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h4 className={styles.cardTitle}>Location sharing</h4>
          {!sharing ? (
            <button className="btn btn-primary btn-block" onClick={startSharing}>Start sharing my live location</button>
          ) : (
            <>
              <p className={styles.hint} style={{ marginBottom: 10 }}>Your location is broadcasting live to the rider's app.</p>
              <button className="btn btn-outline btn-block" onClick={stopSharing}>Stop sharing</button>
            </>
          )}
        </div>

        {ride.status === "driver_en_route" && (
          <button className="btn btn-outline btn-block" onClick={markArrived}>Mark as arrived at pickup</button>
        )}
        {ride.status === "in_progress" && (
          <button className="btn btn-primary btn-block" onClick={endRide}>End ride</button>
        )}
        {ride.status === "completed" && (
          <div className="card" style={{ padding: 18 }}>
            <h4 className={styles.cardTitle}>Rate your rider</h4>
            {ratingSubmitted ? (
              <p className={styles.hint}>Thanks — this feeds into {ride.riderId}'s trust score.</p>
            ) : (
              <>
                <div className={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= stars ? styles.starOn : styles.star} onClick={() => setStars(n)}>★</span>
                  ))}
                </div>
                <div className={styles.tagRow}>
                  {["On time", "Polite", "Easy pickup", "Would ride again"].map((tag) => (
                    <span key={tag} className={`chip ${ratingTags.includes(tag) ? "on" : ""}`} onClick={() => toggleTag(tag)}>{tag}</span>
                  ))}
                </div>
                <textarea
                  className={styles.reviewInput}
                  placeholder="Add a note about your rider (optional)"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                />
                <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={stars === 0} onClick={submitRiderRating}>
                  Submit rating
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showQr && ownProfile?.upiId && (
        <div className={styles.qrOverlay} onClick={() => setShowQr(false)}>
          <div className={styles.qrCard} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.cardTitle}>Scan to pay ₹{ride.fare.totalRs}</h4>
            <div className={styles.qrBox}>
              <QRCodeSVG
                value={`upi://pay?pa=${encodeURIComponent(ownProfile.upiId)}&pn=${encodeURIComponent(ownProfile.name)}&am=${ride.fare.totalRs.toFixed(2)}&cu=INR&tn=${encodeURIComponent("SYNC ride " + ride._id.slice(-6))}`}
                size={220}
              />
            </div>
            <p className={styles.hint} style={{ textAlign: "center", marginTop: 12 }}>
              Any UPI app — GPay, PhonePe, Paytm, BHIM — can scan this.
            </p>
            <button className="btn btn-outline btn-block" style={{ marginTop: 14 }} onClick={() => setShowQr(false)}>Close</button>
          </div>
        </div>
      )}
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
