import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroSingle}`}>
          <span className="pill pill-blue">Trained matching model, not guesswork</span>
          <h1 className={styles.h1}>Your daily commute, matched by data — not luck.</h1>
          <p className={styles.lede}>
            SYNC scores every rider–driver pair on route overlap, timing, and trust using a
            RandomForest model trained on real feature data — then finds you the best match on
            campus, not just the nearest one.
          </p>
          <div className={styles.heroActions}>
            <button className="btn btn-primary" onClick={() => navigate("/find-a-ride")}>Find a ride</button>
            <button className="btn btn-outline" onClick={() => navigate("/signup")}>Become a driver</button>
          </div>
          <ul className={styles.trustRow}>
            <li>✓ ID-verified drivers</li>
            <li>✓ OTP pickup confirmation</li>
            <li>✓ Live location sharing</li>
          </ul>
        </div>
      </section>

      {/* ---------- Why SYNC ---------- */}
      <section className={styles.whySection}>
        <div className="container">
          <h2 className={styles.h2}>Why riders on campus choose SYNC</h2>
          <div className={styles.featureGrid}>
            <Feature title="Matched, not just listed" text="You don't scroll a list of nearby drivers — the model ranks them by how well the whole trip actually fits." />
            <Feature title="Real accountability" text="Every driver is ID-verified, plate-checked at pickup, and rated after every ride." />
            <Feature title="You always know where the car is" text="Live location from the moment your driver leaves, not just an ETA guess." />
            <Feature title="Split the cost fairly" text="Carpool points track who owes what — no awkward cash math at the end of a ride." />
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className={styles.howSection}>
        <div className="container">
          <h2 className={styles.h2}>How a match actually gets made</h2>
          <div className={styles.steps}>
            <Step n="1" title="You tell us your route" text="Pickup point, destination, and a departure window — that's it." />
            <Step n="2" title="The model scores every driver" text="Route overlap, detour cost, timing, preferences and trust, weighed the way real carpools work." />
            <Step n="3" title="You ride, rate, and build trust" text="OTP-confirmed pickup, live tracking en route, and a rating that feeds back into future matches." />
          </div>
        </div>
      </section>

      {/* ---------- For drivers ---------- */}
      <section className={styles.driverSection}>
        <div className={`container ${styles.driverGrid}`}>
          <div>
            <span className="pill pill-navy">For drivers</span>
            <h2 className={styles.h2} style={{ textAlign: "left", marginTop: 12 }}>Already making the drive — bring someone along.</h2>
            <p className={styles.driverText}>
              Set your route once, get matched with riders actually headed your way, and cover
              your fuel cost through carpool points instead of driving alone.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate("/signup")}>Start driving</button>
          </div>
          <ul className={styles.driverList}>
            <li>✓ You set your own schedule and seats</li>
            <li>✓ Riders are ID-verified before they can book</li>
            <li>✓ Your rating builds trust for better matches over time</li>
            <li>✓ No commission — carpool points cover shared fuel cost</li>
          </ul>
        </div>
      </section>

      {/* ---------- Testimonial ---------- */}
      <section className={styles.quoteSection}>
        <div className="container">
          <p className={styles.quote}>
            "I stopped waiting for the bus at 7:40 every day. Now I just open SYNC, and someone
            already going my way shows up."
          </p>
          <p className={styles.quoteAttr}>— Early tester, MIET Jammu</p>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className={styles.ctaBand}>
        <div className={`container ${styles.ctaInner}`}>
          <div>
            <h3 className={styles.ctaTitle}>Ready to skip the wait?</h3>
            <p className={styles.ctaSub}>Find a match in under a minute.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/find-a-ride")}>Find a ride</button>
        </div>
      </section>
    </>
  );
}

function Step({ n, title, text }) {
  return (
    <div className={styles.step}>
      <div className={styles.stepNum}>{n}</div>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}
function Feature({ title, text }) {
  return (
    <div className={styles.feature}>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}
