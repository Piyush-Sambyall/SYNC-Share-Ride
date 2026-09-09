import { useState } from "react";
import styles from "./About.module.css";

export default function About() {
  return (
    <div className="container" style={{ padding: "48px 0 80px" }}>
      {/* ---------- Motive ---------- */}
      <section className={styles.motive}>
        <span className="pill pill-blue">Why SYNC exists</span>
        <h1 className={styles.h1}>One less car on the road, every trip that gets shared.</h1>
        <p className={styles.lede}>
          Most cars headed to MIET Jammu every morning carry one person. That's more fuel burned,
          more traffic at the gate, and more emissions than the same number of trips would need if
          people going the same way actually rode together. SYNC's main motive is simple: make
          carpooling the easy default for the campus commute — not a favor you have to ask a
          friend for — so fewer cars make the same trip empty.
        </p>
        <div className={styles.impactGrid}>
          <ImpactStat k="~1" v="fewer car trip per shared ride" hover="Every completed carpool is one trip that didn't need a second car on the road." />
          <ImpactStat k="↓ CO₂" v="per rider, per trip" hover="Splitting a trip between 2-4 people divides its emissions the same number of ways." />
          <ImpactStat k="↓" v="parking pressure on campus" hover="Fewer single-occupant cars arriving means less gate congestion and fewer parking spots needed." />
        </div>
      </section>

      {/* ---------- Then we execute this ---------- */}
      <section className={styles.execute}>
        <h2 className={styles.h2}>Then we execute this</h2>
        <p className={styles.executeLede}>
          A good motive doesn't move anyone by itself — it has to turn into matches people
          actually trust. Here's what actually runs underneath SYNC to make that happen.
        </p>

        <div className={styles.modelGrid}>
          <div>
            <h3 className={styles.h3}>What the model actually learned</h3>
            <p className={styles.modelText}>
              Trained on 15,000 feature rows extending the project's own dataset schema
              (driver_id / rider_id / label), a RandomForest classifier tells match from
              no-match with 86.9% accuracy and 0.95 AUC. Route overlap and preference
              alignment dominate the decision — not raw distance.
            </p>
            <div className={styles.statGrid}>
              <Stat k="15,000" v="training rows" />
              <Stat k="0.869" v="classifier accuracy" />
              <Stat k="0.948" v="ROC-AUC" />
              <Stat k="0.829" v="regressor R²" />
            </div>
          </div>
          <div className={`card ${styles.impCard}`}>
            <h4 className={styles.impTitle}>Feature importance</h4>
            <Imp label="Route overlap" v={0.434} hover="How much of the driver's route the rider's trip actually shares." />
            <Imp label="Preference match" v={0.255} hover="AC, smoking, and same-gender preferences lining up." />
            <Imp label="Detour distance" v={0.174} hover="Extra distance the driver has to travel to make the pickup." />
            <Imp label="Time window overlap" v={0.123} hover="How close the two departure times actually are." />
            <Imp label="Pickup distance" v={0.009} hover="Straight-line distance from rider to driver's starting point." />
            <Imp label="Driver trust score" v={0.005} hover="A Bayesian-weighted average of the driver's past ratings." />
          </div>
        </div>

        <div className={styles.stackRow}>
          <StackItem k="MongoDB" v="Rider, Driver, Admin, and Ride collections" />
          <StackItem k="Express + Node" v="matching, tracking, and auth APIs" />
          <StackItem k="React" v="the interface you're using right now" />
          <StackItem k="Socket.io" v="the live-tracking broadcast, self-hosted" />
        </div>
      </section>

      {/* ---------- Batch matching ---------- */}
      <section className={styles.batch}>
        <h2 className={styles.h2}>Matching one rider is easy. A busy morning isn't.</h2>
        <p className={styles.executeLede}>
          When several riders request a ride around the same time, scoring each one against the
          nearest driver separately can leave the network worse off overall — two riders might
          both want the same great driver, while a slightly-less-perfect match for each of them
          sits idle. SYNC solves this with the Kuhn–Munkres (Hungarian) algorithm: it looks at
          every rider against every available driver at once and finds the assignment that
          maximises <em>total</em> compatibility across the whole batch, not just each person's
          individual best pick.
        </p>
        <div className={styles.batchGrid}>
          <BatchStep n="1" title="Score everyone against everyone" text="Every pending rider is scored against every online driver using the same trained model." />
          <BatchStep n="2" title="Build a cost matrix" text="Compatibility scores are converted to a cost (1 − score) the algorithm can minimise." />
          <BatchStep n="3" title="Solve for the optimal assignment" text="Kuhn–Munkres finds the rider-driver pairing that minimises total cost — maximising total fit — in O(n³) time." />
        </div>
      </section>

      {/* ---------- Credits ---------- */}
      <section className={styles.credits}>
        <h2 className={styles.h2}>About this project</h2>
        <p className={styles.executeLede}>
          SYNC is a B.Tech final-year project built at MIET Jammu, exploring how a trained
          matching model, real-time tracking, and a genuine safety layer come together in a
          production-style MERN stack — not just a classroom demo.
        </p>
        <div className={styles.creditsRow}>
          <CreditItem k="Built by" v="Piyush Sambyal, B.Tech CSE (AI & ML), MIET Jammu" />
          <CreditItem k="Stack" v="MongoDB · Express · React · Node, trained offline in Python" />
          <CreditItem k="Status" v="Active development — matching, tracking, and safety features shipping iteratively" />
        </div>
      </section>
    </div>
  );
}

function ImpactStat({ k, v, hover }) {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.impactStat} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <b>{k}</b>
      <span>{v}</span>
      {show && <div className={styles.tooltip}>{hover}</div>}
    </div>
  );
}
function Stat({ k, v }) {
  return <div className={styles.stat}><b>{k}</b><span>{v}</span></div>;
}
function Imp({ label, v, hover }) {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.impRow} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className={styles.impLabelWrap}>
        {label}
        {show && <div className={styles.tooltip}>{hover}</div>}
      </span>
      <div className={styles.impTrack}><div className={styles.impFill} style={{ width: `${v * 100}%` }} /></div>
      <span className={styles.impPct}>{Math.round(v * 100)}%</span>
    </div>
  );
}
function StackItem({ k, v }) {
  return (
    <div className={styles.stackItem}>
      <b>{k}</b>
      <span>{v}</span>
    </div>
  );
}
function BatchStep({ n, title, text }) {
  return (
    <div className={styles.batchStep}>
      <div className={styles.batchNum}>{n}</div>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}
function CreditItem({ k, v }) {
  return (
    <div className={styles.creditItem}>
      <span className={styles.creditK}>{k}</span>
      <span className={styles.creditV}>{v}</span>
    </div>
  );
}
