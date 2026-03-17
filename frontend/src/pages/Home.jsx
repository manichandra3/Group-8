import { useState, useEffect } from "react";

const PORTFOLIO_VALUE = (Math.random() * 200000 + 80000).toFixed(2);
const PORTFOLIO_CHANGE = (Math.random() * 4 + 0.3).toFixed(2);

// Which symbols to show as "holdings" in dashboard
const HOLDING_SYMS = ["RELIANCE", "TCS", "INFY", "WIPRO"];
const HOLDING_QTY  = { RELIANCE: 12, TCS: 5, INFY: 20, WIPRO: 35 };

export default function Home({ username, quotes, onLogout }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = time.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  // Filter real holdings from live quotes
  const holdings = quotes.filter((q) => HOLDING_SYMS.includes(q.label));

  // Indices for the top strip
  const indices = quotes.filter((q) => ["NIFTY 50", "SENSEX"].includes(q.label));

  return (
    <div className="auth-card fade-in" style={{ width: 500 }}>
      {/* Logo */}
      <div className="logo-row">
        <div className="logo-gem">📈</div>
        <div>
          <div className="logo-name">TRADE<em>PULSE</em></div>
          <div className="logo-tag">Market Dashboard</div>
        </div>
        <div className="live-chip">
          <span className="dot-blink" />
          {fmt}
        </div>
      </div>

      {/* Indices row */}
      {indices.length > 0 && (
        <div className="trust-bar" style={{ marginBottom: 14 }}>
          {indices.map((q, i) => (
            <div key={q.label} style={{ display: "flex", flex: 1, alignItems: "center" }}>
              {i > 0 && <div className="trust-div" />}
              <div className="trust-item" style={{ flex: 1 }}>
                <div className={`trust-val ${q.up ? "up" : "dn"}`}>
                  {q.up ? "▲" : "▼"} {Number(q.price).toLocaleString("en-IN")}
                </div>
                <div className="trust-lbl">{q.label}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
            <div className="trust-div" />
            <div className="trust-item" style={{ flex: 1 }}>
              <div className="trust-val" style={{ color: "var(--sky)" }}>NSE</div>
              <div className="trust-lbl">Exchange</div>
            </div>
          </div>
        </div>
      )}

      {/* Glass Panel */}
      <div className="glass-panel">
        {/* Welcome */}
        <div className="dash-hero">
          <div className="dash-avatar">🚀</div>
          <div className="dash-title">Welcome Back</div>
          <div className="dash-sub">
            Good to see you, <strong>{username}</strong>
          </div>
        </div>

        {/* Portfolio */}
        <div className="inner-glass port-card">
          <div className="port-lbl">Total Portfolio Value</div>
          <div className="port-val">
            ₹{parseFloat(PORTFOLIO_VALUE).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="port-change">
            ▲ +{PORTFOLIO_CHANGE}% &nbsp;·&nbsp; +₹
            {(PORTFOLIO_VALUE * PORTFOLIO_CHANGE / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })} today
          </div>
        </div>

        {/* Live Holdings */}
        <div className="holdings-title">
          {holdings.length > 0 ? "Live Holdings" : "Holdings"}&nbsp;
          {holdings.length > 0 && (
            <span style={{ color: "var(--green)", fontSize: 9 }}>● LIVE</span>
          )}
        </div>

        {holdings.length > 0 ? (
          holdings.map((q) => (
            <div className="holding-row inner-glass" key={q.label}>
              <div>
                <div className="hold-sym">{q.label}</div>
                <div className="hold-qty">{HOLDING_QTY[q.label] ?? 10} shares</div>
              </div>
              <div>
                <div className="hold-price">
                  ₹{Number(q.price).toLocaleString("en-IN")}
                </div>
                <div className={`hold-chg ${q.up ? "up" : "dn"}`}>
                  {q.up ? "▲" : "▼"} {Math.abs(q.changePct)}%
                </div>
              </div>
            </div>
          ))
        ) : (
          // Skeleton while data loads
          [1, 2, 3, 4].map((i) => (
            <div className="holding-row inner-glass" key={i}>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: "50%", marginBottom: 8 }} />
                <div className="skeleton" style={{ width: "30%" }} />
              </div>
              <div style={{ width: 80 }}>
                <div className="skeleton" style={{ marginBottom: 8 }} />
                <div className="skeleton" style={{ width: "60%", marginLeft: "auto" }} />
              </div>
            </div>
          ))
        )}

        <div style={{ height: 16 }} />

        <button className="btn-danger" onClick={onLogout}>
          ⏻ &nbsp;Sign Out
        </button>
      </div>
    </div>
  );
}