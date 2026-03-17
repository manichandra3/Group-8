import { useState, useEffect } from "react";

const PORTFOLIO_VALUE = (Math.random() * 150000 + 50000).toFixed(2);
const PORTFOLIO_CHANGE = (Math.random() * 5 + 0.5).toFixed(2);

const HOLDINGS = [
  { sym: "RELIANCE", qty: 10, price: "₹2,847", chg: "+1.24%", up: true  },
  { sym: "TCS",      qty: 5,  price: "₹3,921", chg: "-0.43%", up: false },
  { sym: "INFY",     qty: 20, price: "₹1,502", chg: "+0.87%", up: true  },
];

function Home({ username, onLogout }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = time.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className="auth-card view-enter" style={{ width: 480 }}>
      {/* Logo */}
      <div className="logo-section">
        <div className="logo-mark">📈</div>
        <div className="logo-text">TRADE<span>PULSE</span></div>
        <div className="logo-badge">
          <span className="pulse-dot" />
          {fmt}
        </div>
      </div>

      <div className="glass-panel">
        {/* Welcome */}
        <div className="dash-center">
          <span className="dash-icon">🚀</span>
          <div className="dash-title">Market Dashboard</div>
          <div className="dash-sub">
            Welcome back, <span>{username}</span>
          </div>
        </div>

        {/* Portfolio */}
        <div className="portfolio-box">
          <div className="port-label">Total Portfolio Value</div>
          <div className="port-value">
            ₹{parseFloat(PORTFOLIO_VALUE).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="port-change">▲ +{PORTFOLIO_CHANGE}% today</div>
        </div>

        {/* Holdings Table */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase",
            color: "var(--text-dim)", marginBottom: 12, fontWeight: 600
          }}>
            Holdings
          </div>
          {HOLDINGS.map((h) => (
            <div
              key={h.sym}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", marginBottom: 8,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid var(--glass-border)",
                borderRadius: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "var(--white)", fontSize: 14 }}>{h.sym}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{h.qty} shares</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: "var(--white)" }}>
                  {h.price}
                </div>
                <div style={{ fontSize: 11, color: h.up ? "var(--green)" : "var(--red)" }}>
                  {h.up ? "▲" : "▼"} {h.chg}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <button className="logout-btn" onClick={onLogout}>
          ⏻ Sign Out
        </button>
      </div>
    </div>
  );
}

export default Home;