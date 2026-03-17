import { useState } from "react";

const MARKET_STATS = [
  { label: "NIFTY 50",  val: "22,543", up: true  },
  { label: "SENSEX",    val: "74,231", up: true  },
  { label: "NIFTY IT",  val: "33,120", up: false },
];

function Login({ onLoginSuccess, setShowLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = () => {
    setError("");
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const stored = JSON.parse(localStorage.getItem("tp_user") || "null");
      if (stored && username === stored.username && password === stored.password) {
        onLoginSuccess(username);
      } else {
        setError("Invalid credentials. Please try again.");
        setLoading(false);
      }
    }, 600); // simulate network delay
  };

  const handleKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="auth-card view-enter">
      {/* Logo */}
      <div className="logo-section">
        <div className="logo-mark">📈</div>
        <div className="logo-text">TRADE<span>PULSE</span></div>
        <div className="logo-badge">
          <span className="pulse-dot" />
          LIVE
        </div>
      </div>

      {/* Glass Panel */}
      <div className="glass-panel">
        {/* Tabs */}
        <div className="tab-row">
          <button className="tab-btn active">Sign In</button>
          <button className="tab-btn" onClick={() => setShowLogin(false)}>
            Register
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error">⚠ {error}</div>
        )}

        {/* Fields */}
        <div className="form-group">
          <label className="form-label">Account ID / Username</label>
          <input
            className="form-input"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKey}
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Security PIN / Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKey}
            autoComplete="current-password"
          />
        </div>

        <button
          className="submit-btn"
          onClick={handleLogin}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Authenticating..." : "▶ Access Market"}
        </button>

        {/* Market Stats */}
        <div className="stats-row">
          {MARKET_STATS.map((s) => (
            <div className="stat-chip" key={s.label}>
              <div className={`stat-val ${s.up ? "up" : "down"}`}>
                {s.up ? "▲" : "▼"} {s.val}
              </div>
              <div className="stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Login;