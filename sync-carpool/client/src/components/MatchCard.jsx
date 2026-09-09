import styles from "./MatchCard.module.css";

function initials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

export default function MatchCard({ match, onBook }) {
  const { driver, score, feats } = match;
  const pct = (v) => Math.round(v * 100);

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.main}>
        <div className={styles.top}>
          <div className={styles.avatar}>
            {driver.profilePhoto ? <img src={driver.profilePhoto} alt="" /> : initials(driver.name)}
          </div>
          <div>
            <div className={styles.name}>{driver.name}</div>
            <div className={styles.meta}>★ {driver.rating} · {driver.rideCount} rides · {driver.vehicle}</div>
          </div>
        </div>
        <div className={styles.bars}>
          <Bar label="Route overlap" value={feats.route_overlap} display={`${pct(feats.route_overlap)}%`} />
          <Bar label="Detour" value={1 - Math.min(1, feats.detour_km / 8)} display={`${feats.detour_km.toFixed(1)} km`} />
          <Bar label="Time match" value={Math.min(1, feats.time_overlap_min / 60)} display={`${Math.round(feats.time_overlap_min)} min`} />
          <Bar label="Preferences" value={feats.pref_match} display={`${pct(feats.pref_match)}%`} />
        </div>
      </div>
      <div className={styles.stub}>
        <div className={styles.scoreBig}>{pct(score)}</div>
        <div className={styles.scoreLbl}>match score</div>
        <button className="btn btn-primary btn-sm" onClick={() => onBook?.(match)}>Book</button>
      </div>
    </div>
  );
}

function Bar({ label, value, display }) {
  return (
    <div className={styles.barRow}>
      <span className={styles.barLbl}>{label}</span>
      <div className={styles.track}><div className={styles.fill} style={{ width: `${Math.max(4, value * 100)}%` }} /></div>
      <span className={styles.barVal}>{display}</span>
    </div>
  );
}
