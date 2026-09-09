import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import styles from "./Auth.module.css";

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(form);
      if (user.role === "driver") navigate("/drive");
      else if (user.role === "admin") navigate("/admin");
      else navigate("/find-a-ride");
    } catch (err) {
      setError(err.message || "Couldn't sign in. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={`card ${styles.card}`} onSubmit={handleSubmit}>
        <h1 className={styles.h1}>Welcome back</h1>
        <p className={styles.sub}>Sign in to request or offer a ride.</p>

        <div className="field">
          <label>Email</label>
          <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@miet.ac.in" />
        </div>
        <div className="field">
          <label>Password</label>
          <input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Your password" />
        </div>

        {error && <p className={styles.error}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        <p className={styles.switch}>New here? <Link to="/signup">Create an account</Link></p>
      </form>
    </div>
  );
}
