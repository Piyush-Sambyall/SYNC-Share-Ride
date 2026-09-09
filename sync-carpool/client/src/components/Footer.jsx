import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brandCol}>
          <img src="/logo.png" alt="SYNC" className={styles.logo} />
          <p className={styles.tagline}>Collective travel, simplified. Built for the MIET Jammu commute.</p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li>How it works</li>
            <li>The matching model</li>
            <li>Live tracking</li>
            <li>For drivers</li>
          </ul>
        </div>
        <div>
          <h4>Trust &amp; safety</h4>
          <ul>
            <li>Safety center</li>
            <li>ID verification</li>
            <li>Emergency contacts</li>
            <li>Report an issue</li>
          </ul>
        </div>
        <div>
          <h4>Project</h4>
          <ul>
            <li>Dataset &amp; model card</li>
            <li>Engineering writeup</li>
            <li>GitHub repository</li>
            <li>Contact</li>
          </ul>
        </div>
      </div>
      <div className={`container ${styles.bottom}`}>
        <span>© {new Date().getFullYear()} SYNC — a MIET Jammu B.Tech project.</span>
        <span>Built with the MERN stack.</span>
      </div>
    </footer>
  );
}
