import { useState } from "react";

export default function Register({ setShowLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleRegister = () => {
    setError("");
    if (!username.trim() || !password || !confirm) {
      setError("All fields are required.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("tp_user", JSON.stringify({
        username: username.trim(),
        password,
      }));
      setSuccess(true);
      setLoading(false);
      setTimeout(() => setShowLogin(true), 1600);
    }, 800);
  };

  return (
    <div className="auth-card">
      {/* Logo */}
      <div className="logo-row">
        <div className="logo-gem">📈</div>
        <div>
          <div className="logo-name">TRADE<em>PULSE</em></div>
          <div className="logo-tag">Create your free trading account</div>
        </div>
        <div className="live-chip">
          <span className="dot-blink" />
          LIVE
        </div>
      </div>

      {/* Glass panel */}
      <div className="glass-panel fade-in">
        {/* Tabs */}
        <div className="tab-row">
          <button className="tab-btn" onClick={() => setShowLogin(true)}>
            Sign In
          </button>
          <button className="tab-btn active">Register</button>
        </div>

        {error   && <div className="alert alert-err">⚠ {error}</div>}
        {success && <div className="alert alert-ok">✓ Account created! Redirecting to login…</div>}

        <div className="form-group">
          <label className="form-label">Trader Handle</label>
          <div className="input-wrap">
            <span className="input-icon">👤</span>
            <input
              className="form-input"
              type="text"
              placeholder="Choose a username (min. 3 chars)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={success}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Set Password</label>
          <div className="input-wrap">
            <span className="input-icon">🔒</span>
            <input
              className="form-input"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={success}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <div className="input-wrap">
            <span className="input-icon">🔑</span>
            <input
              className="form-input"
              type="password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              autoComplete="new-password"
              disabled={success}
            />
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleRegister}
          disabled={loading || success}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span className="spinner" /> Creating Account…
            </span>
          ) : (
            "▶ Create Free Account"
          )}
        </button>

        {/* Reassurance note */}
        <p style={{
          textAlign: "center", marginTop: 16,
          fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6
        }}>
          🔐 Your data is encrypted end-to-end &nbsp;·&nbsp; SEBI Regulated
        </p>
      </div>
    </div>
  );
}