import { useEffect, useState } from "react";
import { useAuth } from "../api/AuthContext";
import { authGet, authPatch } from "../api/client";
import styles from "./Safety.module.css";

const CATEGORIES = [
  {
    title: "Before you get in",
    points: [
      "Check the license plate, car model and driver photo against the app before getting in.",
      "Wait in a well-lit, populated pickup spot, not an isolated corner.",
      "Confirm the OTP with your driver before the ride starts.",
    ],
  },
  {
    title: "During the ride",
    points: [
      "Share your live trip with a trusted contact for the full ride.",
      "Sit in the back seat when riding solo, and keep your seatbelt on.",
      "If a driver deviates from the shown route without explanation, speak up or end the ride.",
      "Use the SOS button any time something feels wrong.",
    ],
  },
  {
    title: "After the ride",
    points: [
      "Rate your driver honestly — it directly feeds the trust score future matches use.",
      "Report anything that felt off, even if the ride finished normally.",
    ],
  },
];

export default function Safety() {
  const { user, token } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savedContact, setSavedContact] = useState(null); // { name, phone } from the last successful save
  const [error, setError] = useState(null);

  const base = user?.role === "driver" ? "/api/drivers" : "/api/riders";

  useEffect(() => {
    if (!user) return;
    authGet(`${base}/me`, token)
      .then((data) => {
        const c = data.emergencyContact;
        setName(c?.name || "");
        setPhone(c?.phone || "");
        if (c?.name || c?.phone) setSavedContact(c);
      })
      .catch(() => {});
  }, [user, token]);

  async function handleSave() {
    if (!user) { setError("Sign in first so this can be saved to your profile."); return; }
    setError(null);
    try {
      await authPatch(`${base}/me/emergency-contact`, { name, phone }, token);
      setSavedContact({ name, phone });
    } catch (err) {
      setError(err.message || "Couldn't save your emergency contact.");
    }
  }

  return (
    <div className="container" style={{ padding: "56px 0 80px" }}>
      <h1 className={styles.h1}>Safety center</h1>
      <p className={styles.sub}>Read this before your first ride — it takes two minutes.</p>

      <div className={styles.grid}>
        <div className="card" style={{ padding: 24 }}>
          {CATEGORIES.map((cat) => (
            <div key={cat.title} className={styles.category}>
              <h4 className={styles.categoryTitle}>{cat.title}</h4>
              <ul className={styles.list}>
                {cat.points.map((p, i) => (
                  <li key={i}><span className={styles.check}>✓</span>{p}</li>
                ))}
              </ul>
            </div>
          ))}

          <div className={styles.emgBox}>
            <label>Emergency contact</label>
            <div className={styles.emgRow}>
              <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={handleSave}>
              Save emergency contact
            </button>
            {savedContact && (savedContact.name || savedContact.phone) && (
              <p className={styles.savedLine}>
                Saved: <b>{savedContact.name || "—"}</b> · {savedContact.phone || "—"}
                {(savedContact.name !== name || savedContact.phone !== phone) && " (edit and save to update)"}
              </p>
            )}
            {!user && <p className={styles.hint}>Sign in to save this to your account — it'll be included automatically if you ever use SOS.</p>}
          </div>

          <div className={styles.reportBox}>
            <label>Report an issue</label>
            <p className={styles.hint} style={{ marginBottom: 10 }}>
              Something felt wrong on a ride, even after the fact? Use the SOS button during an
              active ride for anything urgent — for anything else, reach the safety team directly.
            </p>
            <div className={styles.reportRow}>
              <span>📧 safety@sync-carpool.local</span>
              <span>📞 SYNC Safety Desk (staffed during campus hours)</span>
            </div>
          </div>
        </div>

        <div className={styles.videoCol}>
          <VideoCard src="https://www.youtube.com/embed/93YWaHdkHMo" caption="Before you ride — verifying your driver" />
          <VideoCard src="https://www.youtube.com/embed/N1FgsOEAvWM" caption="Plate check, name check, share your trip" />
        </div>
      </div>
    </div>
  );
}

function VideoCard({ src, caption }) {
  return (
    <div>
      <div className={styles.videoFrame}>
        <iframe src={src} title={caption} allowFullScreen />
      </div>
      <p className={styles.videoCaption}>{caption}</p>
    </div>
  );
}
