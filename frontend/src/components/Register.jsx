import { useState } from "react";

function Register({ setShowLogin }) {
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);

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
      localStorage.setItem(
        "tp_user",
        JSON.stringify({ username: username.trim(), password })
      );
      setSuccess(true);
      setLoading(false);
      setTimeout(() => setShowLogin(true), 1500);
    }, 700);
  };

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
          <button className="tab-btn" onClick={() => setShowLogin(true)}>
            Sign In
          </button>
          <button className="tab-btn active">Register</button>
        </div>

        {/* Alerts */}
        {error   && <div className="alert alert-error">⚠ {error}</div>}
        {success && <div className="alert alert-success">✓ Account created! Redirecting to login...</div>}

        {/* Fields */}
        <div className="form-group">
          <label className="form-label">Trader Handle</label>
          <input
            className="form-input"
            type="text"
            placeholder="Choose a username (min 3 chars)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Set Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="Repeat your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <button
          className="submit-btn"
          onClick={handleRegister}
          disabled={loading || success}
          style={{ opacity: loading || success ? 0.7 : 1 }}
        >
          {loading ? "Creating Account..." : "▶ Create Account"}
        </button>
      </div>
    </div>
  );
}

export default Register;