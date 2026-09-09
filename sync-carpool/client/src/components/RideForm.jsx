import { useState } from "react";
import { PICKUP_POINTS, MIET } from "../constants/places";
import styles from "./RideForm.module.css";

export default function RideForm({ onSubmit }) {
  const [direction, setDirection] = useState("to_miet"); // "to_miet" | "from_miet"
  const [otherPoint, setOtherPoint] = useState(PICKUP_POINTS[0].value);
  const [time, setTime] = useState("08:15");
  const [prefs, setPrefs] = useState({ ac: true, nosmoking: false, samegender: false, evOnly: false });

  function toggle(key) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  function submit(e) {
    e.preventDefault();
    onSubmit?.({ direction, otherPoint, time, prefs });
  }

  const isToMiet = direction === "to_miet";

  return (
    <form className={`card ${styles.form}`} onSubmit={submit}>
      <div className="field">
        <label>Trip direction</label>
        <div className="chip-row">
          <div className={`chip ${isToMiet ? "on" : ""}`} onClick={() => setDirection("to_miet")}>To MIET</div>
          <div className={`chip ${!isToMiet ? "on" : ""}`} onClick={() => setDirection("from_miet")}>From MIET</div>
        </div>
      </div>

      <div className={styles.row}>
        <div className="field" style={{ flex: 1 }}>
          <label>{isToMiet ? "Pickup point" : "Starting point"}</label>
          {isToMiet ? (
            <select value={otherPoint} onChange={(e) => setOtherPoint(e.target.value)}>
              {PICKUP_POINTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          ) : (
            <select disabled><option>{MIET.label}</option></select>
          )}
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Destination</label>
          {isToMiet ? (
            <select disabled><option>{MIET.label}</option></select>
          ) : (
            <select value={otherPoint} onChange={(e) => setOtherPoint(e.target.value)}>
              {PICKUP_POINTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          )}
        </div>
        <div className="field" style={{ width: 140 }}>
          <label>Depart at</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Preferences</label>
        <div className="chip-row">
          <div className={`chip ${prefs.ac ? "on" : ""}`} onClick={() => toggle("ac")}>AC vehicle</div>
          <div className={`chip ${prefs.samegender ? "on" : ""}`} onClick={() => toggle("samegender")}>Same gender driver</div>
          <div className={`chip ${prefs.nosmoking ? "on" : ""}`} onClick={() => toggle("nosmoking")}>No smoking</div>
          <div className={`chip ${prefs.evOnly ? "on" : ""}`} onClick={() => toggle("evOnly")}>⚡ EV only</div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-block">Find my match</button>
    </form>
  );
}
