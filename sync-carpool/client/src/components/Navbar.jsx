import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const linkClass = ({ isActive }) => (isActive ? styles.linkActive : styles.link);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand}>
          <img src="/logo.png" alt="SYNC — Share a Ride" className={styles.logo} />
        </Link>
        <nav className={styles.nav}>
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          {user?.role === "driver" ? (
            <NavLink to="/drive" className={linkClass}>Driver dashboard</NavLink>
          ) : (
            <NavLink to="/find-a-ride" className={linkClass}>Find a ride</NavLink>
          )}
          <NavLink to="/safety" className={linkClass}>Safety</NavLink>
          <NavLink to="/about" className={linkClass}>About</NavLink>
          {user?.role === "admin" && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
          {user && user.role !== "admin" && <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>}
          {user?.role === "rider" && <NavLink to="/recurring-rides" className={linkClass}>Recurring</NavLink>}
        </nav>
        <div className={styles.actions}>
          {user ? (
            <>
              {user.role !== "admin" ? (
                <button className={styles.helloBtn} onClick={() => navigate("/profile")} title="Open your profile">
                  <span className={styles.avatar}>
                    {user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : user.name?.[0]}
                  </span>
                  <span className={styles.hello}>Hi, {user.name.split(" ")[0]}</span>
                  <span className={styles.roleTag}>{user.role}</span>
                </button>
              ) : (
                <span className={styles.hello}>Hi, {user.name.split(" ")[0]} <span className={styles.roleTag}>admin</span></span>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => { logout(); navigate("/"); }}>Sign out</button>
            </>
          ) : (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => navigate("/signin")}>Sign in</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate("/signup")}>Get started</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
