import { useState } from "react";
import { useNavigate } from "react-router-dom";

/* Trust stats shown below logo */
const TRUST_STATS = [
  { val: "2M+", lbl: "Traders" },
  { val: "₹4.2T", lbl: "Volume" },
  { val: "99.9%", lbl: "Uptime" },
  { val: "SEBI", lbl: "Regulated" },
];

export default function Login({ quotes }) {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {

    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {

      setLoading(true);

      const res = await fetch("http://localhost:8081/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("role", data.user.role);

      if (data.user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/home");
      }

    } catch {
      setError("Server error. Try again.");
    }

    setLoading(false);
  };

  const chips = quotes
    ?.filter((q) => ["NIFTY 50", "SENSEX", "INFY"].includes(q.label))
    .slice(0, 3);

  return (
    <div className="auth-card">

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

      <div className="trust-bar">
        {TRUST_STATS.map((t, i) => (
          <div key={t.lbl} style={{ display: "flex", flex: 1 }}>
            {i > 0 && <div className="trust-div" />}
            <div className="trust-item" style={{ flex: 1 }}>
              <div className="trust-val">{t.val}</div>
              <div className="trust-lbl">{t.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel fade-in">

        <div className="tab-row">
          <button className="tab-btn active">Sign In</button>

          <button
            className="tab-btn"
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </div>

        {error && <div className="alert alert-err">⚠ {error}</div>}

        <div className="form-group">
          <label className="form-label">Email</label>

          <div className="input-wrap">
            <span className="input-icon">📧</span>

            <input
              className="form-input"
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>

          <div className="input-wrap">
            <span className="input-icon">🔒</span>

            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Authenticating..." : "▶ Access Market"}
        </button>

        {chips?.length > 0 && (
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

      </div>
    </div>
  );
}