import { useEffect, useState } from "react";
import { useAuth } from "../api/AuthContext";
import { authGet, authPatch } from "../api/client";
import styles from "./Profile.module.css";

export default function Profile() {
  const { user, token, updateUser } = useAuth();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const base = user?.role === "driver" ? "/api/drivers" : "/api/riders";

  useEffect(() => {
    if (!user) return;
    authGet(`${base}/me`, token).then(setForm).catch(() => setError("Couldn't load your profile."));
  }, [user, token]);

  function update(key, value) { setForm((f) => ({ ...f, [key]: value })); setSaved(false); }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Please choose an image under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("profilePhoto", reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone, altPhone: form.altPhone,
        dob: form.dob, profilePhoto: form.profilePhoto, userType: form.userType,
      };
      if (user.role === "rider") {
        Object.assign(payload, {
          prefAc: form.prefAc, prefNoSmoking: form.prefNoSmoking,
          prefSameGender: form.prefSameGender, prefEvOnly: form.prefEvOnly,
        });
      } else {
        Object.assign(payload, { plateNumber: form.plateNumber, isEV: form.isEV, vehicle: form.vehicle, upiId: form.upiId });
      }
      const updated = await authPatch(`${base}/me`, payload, token);
      setForm(updated);
      updateUser({ name: updated.name, profilePhoto: updated.profilePhoto });
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <div className="container" style={{ padding: 60 }}><p>Sign in to view your profile.</p></div>;
  if (!form) return <div className="container" style={{ padding: 60 }}><p>Loading your profile…</p></div>;

  return (
    <div className="container" style={{ padding: "44px 0 70px", maxWidth: 640 }}>
      <h1 className={styles.h1}>Your profile</h1>
      <p className={styles.sub}>{user.role === "driver" ? form.driverId : form.riderId}</p>

      <form className={`card ${styles.card}`} onSubmit={handleSubmit}>
        <div className={styles.photoRow}>
          <div className={styles.photoPreview}>
            {form.profilePhoto ? <img src={form.profilePhoto} alt="Profile" /> : <span>{form.name?.[0]}</span>}
          </div>
          <label className={styles.uploadBtn}>
            Upload photo
            <input type="file" accept="image/*" onChange={handlePhoto} hidden />
          </label>
        </div>

        <div className={styles.row2}>
          <div className="field"><label>Full name</label><input value={form.name || ""} onChange={(e) => update("name", e.target.value)} /></div>
          <div className="field"><label>Date of birth</label><input type="date" value={form.dob ? form.dob.slice(0, 10) : ""} onChange={(e) => update("dob", e.target.value)} /></div>
        </div>
        <div className="field"><label>Email</label><input type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} /></div>
        <div className={styles.row2}>
          <div className="field"><label>Contact number</label><input value={form.phone || ""} onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
          <div className="field"><label>Alternate contact</label><input value={form.altPhone || ""} onChange={(e) => update("altPhone", e.target.value)} /></div>
        </div>
        <div className="field">
          <label>I'm a</label>
          <div className="chip-row">
            <div className={`chip ${form.userType === "student" ? "on" : ""}`} onClick={() => update("userType", "student")}>Student</div>
            <div className={`chip ${form.userType === "faculty" ? "on" : ""}`} onClick={() => update("userType", "faculty")}>Faculty</div>
          </div>
        </div>

        {user.role === "rider" ? (
          <div className="field">
            <label>Ride preferences</label>
            <div className="chip-row">
              <div className={`chip ${form.prefAc ? "on" : ""}`} onClick={() => update("prefAc", !form.prefAc)}>Prefer AC</div>
              <div className={`chip ${form.prefNoSmoking ? "on" : ""}`} onClick={() => update("prefNoSmoking", !form.prefNoSmoking)}>No smoking</div>
              <div className={`chip ${form.prefSameGender ? "on" : ""}`} onClick={() => update("prefSameGender", !form.prefSameGender)}>Same gender driver</div>
              <div className={`chip ${form.prefEvOnly ? "on" : ""}`} onClick={() => update("prefEvOnly", !form.prefEvOnly)}>⚡ EV only</div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.row2}>
              <div className="field"><label>Vehicle model</label><input value={form.vehicle || ""} onChange={(e) => update("vehicle", e.target.value)} /></div>
              <div className="field"><label>Plate number</label><input value={form.plateNumber || ""} onChange={(e) => update("plateNumber", e.target.value.toUpperCase())} /></div>
            </div>
            <div className="field">
              <div className="chip-row">
                <div className={`chip ${form.isEV ? "on" : ""}`} onClick={() => update("isEV", !form.isEV)}>⚡ Electric vehicle</div>
              </div>
            </div>
            <div className="field">
              <label>UPI ID (for the payment QR fallback)</label>
              <input value={form.upiId || ""} onChange={(e) => update("upiId", e.target.value)} placeholder="yourname@okhdfcbank" />
            </div>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}
        <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        {saved && <span className={styles.savedTag}>Saved</span>}
      </form>
    </div>
  );
}
