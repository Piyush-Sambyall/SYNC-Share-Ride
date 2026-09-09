import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import styles from "./Auth.module.css";

const MIET_EMAIL_DOMAIN = "@mietjammu.in";
const PHONE_REGEX = /^[6-9]\d{9}$/;
const PLATE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;

const EMPTY = {
  role: "rider",
  name: "", email: "", phone: "", altPhone: "", password: "",
  gender: "", userType: "student", smoker: false, dob: "", idType: "student_id", idNumber: "",
  prefAc: true, prefNoSmoking: false, prefSameGender: false, prefEvOnly: false,
  // driver-only
  vehicle: "", plateNumber: "", licenseNumber: "", vehicleRcNumber: "", insuranceNumber: "", isEV: false,
};

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function update(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  function validate() {
    const email = form.email.trim().toLowerCase();
    if (!email.endsWith(MIET_EMAIL_DOMAIN)) {
      return `Signup is restricted to MIET email addresses (must end in ${MIET_EMAIL_DOMAIN}).`;
    }
    if (!PHONE_REGEX.test(form.phone)) {
      return "Enter a valid 10-digit Indian mobile number (starting 6-9).";
    }
    if (form.role === "driver" && !PLATE_REGEX.test(form.plateNumber.replace(/\s+/g, "").toUpperCase())) {
      return "Enter a valid plate number, e.g. JK02AB1234.";
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const clientError = validate();
    if (clientError) { setError(clientError); return; }
    setLoading(true);
    try {
      const user = await signup(form);
      navigate(user.role === "driver" ? "/drive" : "/find-a-ride");
    } catch (err) {
      setError(err.message || "Couldn't create your account. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={`card ${styles.card} ${styles.wide}`} onSubmit={handleSubmit}>
        <h1 className={styles.h1}>Create your account</h1>
        <p className={styles.sub}>Saved to your own MongoDB — takes a couple of minutes.</p>

        <div className="field">
          <label>I'm signing up as a</label>
          <div className="chip-row">
            <div className={`chip ${form.role === "rider" ? "on" : ""}`} onClick={() => update("role", "rider")}>Rider</div>
            <div className={`chip ${form.role === "driver" ? "on" : ""}`} onClick={() => update("role", "driver")}>Driver</div>
          </div>
        </div>

        <div className={styles.sectionLabel}>Basic details</div>
        <div className={styles.row2}>
          <div className="field"><label>Full name</label><input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Piyush Sambyal" /></div>
          <div className="field">
            <label>MIET email</label>
            <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder={`you${MIET_EMAIL_DOMAIN}`} />
          </div>
        </div>
        <div className={styles.row2}>
          <div className="field">
            <label>Mobile number</label>
            <input required value={form.phone} onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98xxxxxxxx" />
          </div>
          <div className="field"><label>Alternate phone</label><input value={form.altPhone} onChange={(e) => update("altPhone", e.target.value)} placeholder="Optional" /></div>
        </div>
        <div className="field"><label>Password</label><input required type="password" minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 6 characters" /></div>

        <div className={styles.sectionLabel}>A bit more about you</div>
        <div className={styles.row2}>
          <div className="field">
            <label>Gender</label>
            <select value={form.gender} onChange={(e) => update("gender", e.target.value)} required>
              <option value="" disabled>Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div className="field">
            <label>I'm a</label>
            <select value={form.userType} onChange={(e) => update("userType", e.target.value)}>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Date of birth</label><input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} /></div>
        <div className="field">
          <label>Smoking</label>
          <div className="chip-row">
            <div className={`chip ${!form.smoker ? "on" : ""}`} onClick={() => update("smoker", false)}>Non-smoker</div>
            <div className={`chip ${form.smoker ? "on" : ""}`} onClick={() => update("smoker", true)}>Smoker</div>
          </div>
        </div>
        <div className={styles.row2}>
          <div className="field">
            <label>ID type</label>
            <select value={form.idType} onChange={(e) => update("idType", e.target.value)}>
              <option value="student_id">Student ID</option>
              <option value="govt_id">Govt. ID (Aadhaar / DL / Voter ID)</option>
            </select>
          </div>
          <div className="field"><label>ID number</label><input value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} placeholder="For verification" /></div>
        </div>

        {form.role === "rider" && (
          <>
            <div className={styles.sectionLabel}>Default ride preferences</div>
            <div className="field">
              <div className="chip-row">
                <div className={`chip ${form.prefAc ? "on" : ""}`} onClick={() => update("prefAc", !form.prefAc)}>Prefer AC vehicle</div>
                <div className={`chip ${form.prefNoSmoking ? "on" : ""}`} onClick={() => update("prefNoSmoking", !form.prefNoSmoking)}>No smoking</div>
                <div className={`chip ${form.prefSameGender ? "on" : ""}`} onClick={() => update("prefSameGender", !form.prefSameGender)}>Same gender driver</div>
                <div className={`chip ${form.prefEvOnly ? "on" : ""}`} onClick={() => update("prefEvOnly", !form.prefEvOnly)}>⚡ EV only</div>
              </div>
            </div>
          </>
        )}

        {form.role === "driver" && (
          <>
            <div className={styles.sectionLabel}>Vehicle &amp; safety details</div>
            <div className={styles.row2}>
              <div className="field"><label>Vehicle model</label><input value={form.vehicle} onChange={(e) => update("vehicle", e.target.value)} placeholder="e.g. Swift Dzire" /></div>
              <div className="field"><label>Plate number</label><input required value={form.plateNumber} onChange={(e) => update("plateNumber", e.target.value.toUpperCase())} placeholder="JK02 AB 1234" /></div>
            </div>
            <div className={styles.row2}>
              <div className="field"><label>Driving license number</label><input value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} /></div>
              <div className="field"><label>Vehicle RC number</label><input value={form.vehicleRcNumber} onChange={(e) => update("vehicleRcNumber", e.target.value)} /></div>
            </div>
            <div className="field"><label>Insurance number (optional)</label><input value={form.insuranceNumber} onChange={(e) => update("insuranceNumber", e.target.value)} /></div>
            <div className="field">
              <div className="chip-row">
                <div className={`chip ${form.isEV ? "on" : ""}`} onClick={() => update("isEV", !form.isEV)}>⚡ This is an electric vehicle</div>
              </div>
            </div>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 10 }}>{loading ? "Creating account…" : "Create account"}</button>
        <p className={styles.switch}>Already have an account? <Link to="/signin">Sign in</Link></p>
      </form>
    </div>
  );
}
