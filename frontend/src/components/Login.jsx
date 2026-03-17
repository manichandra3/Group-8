import { useState } from "react";

/* Trust stats shown below logo — builds brand confidence */
const TRUST_STATS = [
  { val: "2M+",   lbl: "Traders" },
  { val: "₹4.2T", lbl: "Volume" },
  { val: "99.9%", lbl: "Uptime"  },
  { val: "SEBI",  lbl: "Regulated" },
];

export default function Login({ onLoginSuccess, setShowLogin, quotes }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = () => {
    setError("");
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const stored = JSON.parse(localStorage.getItem("tp_user") || "null");
      if (stored && username.trim() === stored.username && password === stored.password) {
        onLoginSuccess(username.trim());
      } else {
        setError("Invalid credentials. Please check and try again.");
        setLoading(false);
      }
    }, 700);
  };

  // Pick 3 key index quotes for the bottom chips
  const chips = quotes
    .filter((q) => ["NIFTY 50", "SENSEX", "INFY"].includes(q.label))
    .slice(0, 3);

  return (
    <div className="auth-card">
      {/* Logo */}
      <div className="logo-row">
        <div className="logo-gem">📈</div>
        <div>
          <div className="logo-name">TRADE<em>PULSE</em></div>
          <div className="logo-tag">India's most trusted trading platform</div>
        </div>
        <div className="live-chip">
          <span className="dot-blink" />
          LIVE
        </div>
      </div>

      {/* Trust bar */}
      <div className="trust-bar">
        {TRUST_STATS.map((t, i) => (
          <div key={t.lbl} style={{ display: "flex", flex: 1, alignItems: "center" }}>
            {i > 0 && <div className="trust-div" />}
            <div className="trust-item" style={{ flex: 1 }}>
              <div className="trust-val">{t.val}</div>
              <div className="trust-lbl">{t.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Glass panel */}
      <div className="glass-panel fade-in">
        {/* Tabs */}
        <div className="tab-row">
          <button className="tab-btn active">Sign In</button>
          <button className="tab-btn" onClick={() => setShowLogin(false)}>
            Register
          </button>
        </div>

        {error && <div className="alert alert-err">⚠ {error}</div>}

        <div className="form-group">
          <label className="form-label">Account ID / Username</label>
          <div className="input-wrap">
            <span className="input-icon">👤</span>
            <input
              className="form-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="username"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password / Security PIN</label>
          <div className="input-wrap">
            <span className="input-icon">🔒</span>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span className="spinner" /> Authenticating…
            </span>
          ) : (
            "▶ Access Market"
          )}
        </button>

        {/* Live market chips — real data from Yahoo Finance */}
        {chips.length > 0 && (
          <div className="mkt-row">
            {chips.map((q) => (
              <div className="mkt-chip" key={q.label}>
                <div className={`mkt-val ${q.up ? "up" : "dn"}`}>
                  {q.up ? "▲" : "▼"} {Math.abs(q.changePct)}%
                </div>
                <div className="mkt-lbl">{q.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Skeleton chips while loading */}
        {chips.length === 0 && (
          <div className="mkt-row">
            {[1, 2, 3].map((i) => (
              <div className="mkt-chip" key={i}>
                <div className="skeleton" style={{ width: "60%", margin: "0 auto 6px" }} />
                <div className="skeleton" style={{ width: "40%", margin: "0 auto" }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}