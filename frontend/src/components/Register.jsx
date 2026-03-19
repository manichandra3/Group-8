import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {

  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [role, setRole] = useState("USER");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [loading, setLoading] = useState(false);

  const doRegisterRequest = async () => {
    const payload = {
      username,
      email,
      password,
      role
    };

    const res = await fetch("http://localhost:8085/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return fetch("http://localhost:8085/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    }

    return res;
  };

  const handleRegister = async () => {

    setError("");

    if (!username || !email || !password || !confirm) {
      setError("All fields required");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    try {

      setLoading(true);

      const res = await doRegisterRequest();

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch {
      setError("Server error");
    }

    setLoading(false);
  };

  return (
    <div className="auth-card">

      <div className="logo-row">
        <div className="logo-gem">📈</div>

        <div>
          <div className="logo-name">TRADE<em>PULSE</em></div>
          <div className="logo-tag">Create your trading account</div>
        </div>

        <div className="live-chip">
          <span className="dot-blink" />
          LIVE
        </div>
      </div>

      <div className="glass-panel fade-in">

        <div className="tab-row">

          <button
            className="tab-btn"
            onClick={() => navigate("/login")}
          >
            Sign In
          </button>

          <button className="tab-btn active">
            Register
          </button>

        </div>

        {error && <div className="alert alert-err">⚠ {error}</div>}

        {success && (
          <div className="alert alert-ok">
            ✓ Account created successfully
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Username</label>

          <div className="input-wrap">
            <span className="input-icon">👤</span>

            <input
              className="form-input"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

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
          <label className="form-label">Role</label>

          <select
            className="form-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>

          <div className="input-wrap">
            <span className="input-icon">🔒</span>

            <input
              className="form-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Creating..." : "▶ Create Account"}
        </button>

      </div>
    </div>
  );
}