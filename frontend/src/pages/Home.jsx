import { useState } from "react";
import { useData } from "../context/DataContext";  // <-- import central data store
import Clock from "../components/Clock";
import AdminPanel from "../components/AdminPanel";   // <-- import admin panel component

/* ─── Mini sparkline SVG ─── */
function Sparkline({ up }) {
  const pts = up
    ? "0,18 8,14 16,15 24,10 32,11 40,6 48,7 56,3 64,4 72,1"
    : "0,2  8,5  16,4  24,9  32,8  40,13 48,12 56,16 64,15 72,19";
  return (
    <svg width={72} height={22} style={{ display: "block" }}>
      <polyline points={pts} fill="none"
        stroke={up ? "#10b981" : "#ef4444"} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Donut chart (pure SVG) ─── */
function DonutChart({ data }) {
  const r = 44, cx = 52, cy = 52, stroke = 11;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((a, d) => a + d.value, 0);
  let offset = 0;
  const colors = ["#3b82f6", "#06b6d4", "#a855f7", "#10b981", "#f59e0b"];
  return (
    <svg width={104} height={104}>
      {data.map((d, i) => {
        const dash = (d.value / total) * circ;
        const gap = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={colors[i % colors.length]} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
        );
        offset += dash + 2;
        return el;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11}
        fill="#94a3b8" fontFamily="Sora,sans-serif">Total</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={12}
        fill="#f0f6ff" fontFamily="Sora,sans-serif" fontWeight="700">
        ₹{(total / 1000).toFixed(0)}K
      </text>
    </svg>
  );
}

/* ─── Section: Dashboard Overview ─── */
function SectionDashboard({ quotes, portfolio }) {
  const up = portfolio.todayPnl >= 0;
  const top = quotes.slice(0, 6);
  const donutData = [
    { label: "Stocks", value: 160000 },
    { label: "Mutual Funds", value: 112000 },
    { label: "SIP", value: 28000 },
    { label: "Gold", value: 8000 },
    { label: "IPO", value: 4840 },
  ];
  return (
    <div className="d-section fade-in">
      {/* Portfolio summary cards */}
      <div className="d-grid-3" style={{ marginBottom: 24 }}>
        <div className="d-card accent-card">
          <div className="d-card-label">Current Value</div>
          <div className="d-card-value big">
            ₹{portfolio.current.toLocaleString("en-IN")}
          </div>
          <div className={`d-card-sub ${up ? "pos" : "neg"}`}>
            {up ? "▲" : "▼"} ₹{Math.abs(portfolio.todayPnl).toLocaleString("en-IN")} ({portfolio.todayPct}%) today
          </div>
        </div>
        <div className="d-card">
          <div className="d-card-label">Total Invested</div>
          <div className="d-card-value">₹{portfolio.invested.toLocaleString("en-IN")}</div>
          <div className="d-card-sub muted">Across all instruments</div>
        </div>
        <div className="d-card">
          <div className="d-card-label">Total Returns</div>
          <div className="d-card-value pos">+₹{portfolio.totalPnl.toLocaleString("en-IN")}</div>
          <div className="d-card-sub pos">+{portfolio.totalPct}% overall</div>
        </div>
      </div>

      {/* Allocation + Market snapshot */}
      <div className="d-row" style={{ gap: 20, marginBottom: 24 }}>
        {/* Donut */}
        <div className="d-card" style={{ flex: "0 0 auto" }}>
          <div className="d-card-label" style={{ marginBottom: 14 }}>Portfolio Allocation</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <DonutChart data={donutData} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {donutData.map((d, i) => {
                const colors = ["#3b82f6", "#06b6d4", "#a855f7", "#10b981", "#f59e0b"];
                return (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-body)" }}>{d.label}</span>
                    <span style={{ fontSize: 12, color: "var(--text-bright)", marginLeft: "auto", paddingLeft: 12, fontFamily: "Share Tech Mono,monospace" }}>
                      ₹{(d.value / 1000).toFixed(0)}K
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live market snapshot */}
        <div className="d-card" style={{ flex: 1, minWidth: 0 }}>
          <div className="d-card-label" style={{ marginBottom: 14 }}>
            Live Market &nbsp;<span style={{ color: "var(--green)", fontSize: 9 }}>● LIVE</span>
          </div>
          {top.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {top.map((q) => (
                <div key={q.label} className="mkt-row-item">
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-bright)", fontSize: 13 }}>{q.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>NSE</div>
                  </div>
                  <Sparkline up={q.up} />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "Share Tech Mono,monospace", fontSize: 13, color: "var(--text-bright)" }}>
                      ₹{Number(q.price).toLocaleString("en-IN")}
                    </div>
                    <div className={q.up ? "pos" : "neg"} style={{ fontSize: 11 }}>
                      {q.up ? "▲" : "▼"} {Math.abs(q.changePct)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="mkt-row-item">
                  <div style={{ flex: 1 }}><div className="sk" style={{ width: "60%", marginBottom: 5 }} /><div className="sk" style={{ width: "30%" }} /></div>
                  <div className="sk" style={{ width: 72, height: 22 }} />
                  <div style={{ textAlign: "right" }}><div className="sk" style={{ width: 60, marginBottom: 5 }} /><div className="sk" style={{ width: 40, marginLeft: "auto" }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="d-card" style={{ marginBottom: 0 }}>
        <div className="d-card-label" style={{ marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { icon: "📈", label: "Buy Stocks", color: "#3b82f6" },
            { icon: "💰", label: "Invest in MF", color: "#06b6d4" },
            { icon: "🔄", label: "Start SIP", color: "#a855f7" },
            { icon: "🏆", label: "Apply IPO", color: "#f59e0b" },
            { icon: "📊", label: "View Reports", color: "#10b981" },
            { icon: "💎", label: "Digital Gold", color: "#ec4899" },
          ].map((a) => (
            <div key={a.label} className="quick-action" style={{ "--qa-color": a.color }}>
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <span style={{ fontSize: 11, color: "var(--text-body)", marginTop: 4, textAlign: "center" }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Section: Stocks ─── */
function SectionStocks({ quotes }) {
  const [tab, setTab] = useState("holdings");
  const holdings = quotes.filter(q => ["RELIANCE", "TCS", "INFY", "WIPRO", "ITC"].includes(q.label));
  const watchlist = quotes.filter(q => ["BAJFIN", "ADANI", "HDFCBANK"].includes(q.label));
  const display = tab === "holdings" ? holdings : watchlist;

  return (
    <div className="d-section fade-in">
      <div className="d-page-title">📊 Stocks</div>
      <div className="d-subtabs">
        {["holdings", "watchlist", "top gainers", "top losers"].map(t => (
          <button key={t} className={`d-subtab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary row */}
      <div className="d-grid-3" style={{ marginBottom: 20 }}>
        <div className="d-card"><div className="d-card-label">Invested</div><div className="d-card-value">₹1,60,000</div></div>
        <div className="d-card"><div className="d-card-label">Current</div><div className="d-card-value pos">₹1,94,200</div></div>
        <div className="d-card"><div className="d-card-label">P&L</div><div className="d-card-value pos">+₹34,200 (+21.4%)</div></div>
      </div>

      {/* Table */}
      <div className="d-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="d-table-head">
          <span style={{ flex: 2 }}>Stock</span>
          <span style={{ flex: 1, textAlign: "right" }}>LTP</span>
          <span style={{ flex: 1, textAlign: "right" }}>Chg%</span>
          <span style={{ flex: 1, textAlign: "right" }}>7D Chart</span>
          <span style={{ flex: 1, textAlign: "right" }}>Action</span>
        </div>
        {display.length > 0 ? display.map((q) => (
          <div key={q.label} className="d-table-row">
            <div style={{ flex: 2 }}>
              <div style={{ fontWeight: 700, color: "var(--text-bright)", fontSize: 13 }}>{q.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>NSE · Equity</div>
            </div>
            <div style={{ flex: 1, textAlign: "right", fontFamily: "Share Tech Mono,monospace", fontSize: 13, color: "var(--text-bright)" }}>
              ₹{Number(q.price).toLocaleString("en-IN")}
            </div>
            <div style={{ flex: 1, textAlign: "right" }} className={q.up ? "pos" : "neg"}>
              {q.up ? "▲" : "▼"} {Math.abs(q.changePct)}%
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              <Sparkline up={q.up} />
            </div>
            <div style={{ flex: 1, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button className="btn-xs buy">BUY</button>
              <button className="btn-xs sell">SELL</button>
            </div>
          </div>
        )) : (
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="d-table-row">
              <div style={{ flex: 2 }}><div className="sk" style={{ width: "50%", marginBottom: 5 }} /><div className="sk" style={{ width: "30%" }} /></div>
              <div style={{ flex: 1, textAlign: "right" }}><div className="sk" style={{ width: 60, marginLeft: "auto" }} /></div>
              <div style={{ flex: 1, textAlign: "right" }}><div className="sk" style={{ width: 40, marginLeft: "auto" }} /></div>
              <div style={{ flex: 1 }}><div className="sk" style={{ width: 72, marginLeft: "auto", height: 22 }} /></div>
              <div style={{ flex: 1 }}><div className="sk" style={{ width: 80, marginLeft: "auto" }} /></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Section: Mutual Funds ─── */
function SectionMF({ holdings }) {
  return (
    <div className="d-section fade-in">
      <div className="d-page-title">🏦 Mutual Funds</div>
      <div className="d-grid-3" style={{ marginBottom: 20 }}>
        <div className="d-card"><div className="d-card-label">Invested</div><div className="d-card-value">₹1,45,000</div></div>
        <div className="d-card"><div className="d-card-label">Current</div><div className="d-card-value pos">₹1,85,300</div></div>
        <div className="d-card"><div className="d-card-label">XIRR</div><div className="d-card-value pos">+18.4%</div></div>
      </div>
      {holdings.map((f) => {
        const ret = f.current - f.invested;
        const pct = ((ret / f.invested) * 100).toFixed(1);
        return (
          <div key={f.name} className="d-card mf-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--text-bright)", fontSize: 14, marginBottom: 4 }}>{f.name}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="tag-chip">{f.type}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Share Tech Mono,monospace", fontSize: 14, color: "var(--text-bright)", fontWeight: 700 }}>
                  ₹{f.current.toLocaleString("en-IN")}
                </div>
                <div className="pos" style={{ fontSize: 12 }}>+₹{ret.toLocaleString("en-IN")} (+{pct}%)</div>
              </div>
            </div>
            <div className="mf-progress-track">
              <div className="mf-progress-fill" style={{ width: `${Math.min((f.current / f.invested) * 100 - 100 + 20, 90)}%` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Invested: ₹{f.invested.toLocaleString("en-IN")}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-xs buy">+ Invest</button>
                <button className="btn-xs" style={{ borderColor: "rgba(255,255,255,0.12)", color: "var(--text-muted)" }}>Redeem</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Section: SIP ─── */
function SectionSIP({ sips }) {
  const totalSIP = sips.filter(s => s.status === "Active").reduce((a, s) => a + s.amt, 0);
  return (
    <div className="d-section fade-in">
      <div className="d-page-title">🔄 SIP Manager</div>
      <div className="d-grid-3" style={{ marginBottom: 20 }}>
        <div className="d-card"><div className="d-card-label">Active SIPs</div><div className="d-card-value">{sips.filter(s => s.status === "Active").length}</div></div>
        <div className="d-card"><div className="d-card-label">Monthly Amount</div><div className="d-card-value">₹{totalSIP.toLocaleString("en-IN")}</div></div>
        <div className="d-card"><div className="d-card-label">Total Invested</div><div className="d-card-value">₹42,000</div></div>
      </div>
      <div className="d-card" style={{ marginBottom: 20 }}>
        <div className="d-card-label" style={{ marginBottom: 14 }}>Your SIPs</div>
        {sips.map((s) => (
          <div key={s.name} className="sip-row">
            <div className={`sip-status-dot ${s.status === "Active" ? "active" : "paused"}`} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "var(--text-bright)", fontSize: 13 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Every {s.date} · Next: {s.nextDate}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Share Tech Mono,monospace", fontSize: 14, color: "var(--text-bright)", fontWeight: 700 }}>₹{s.amt.toLocaleString()}</div>
              <span className={`status-badge ${s.status === "Active" ? "active" : "paused"}`}>{s.status}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-full-primary">+ Start New SIP</button>
    </div>
  );
}

/* ─── Section: IPO ─── */
function SectionIPO({ ipos }) {
  const statusColor = { open: "#10b981", upcoming: "#3b82f6", listed: "#94a3b8" };
  return (
    <div className="d-section fade-in">
      <div className="d-page-title">🚀 IPO</div>
      <div className="d-grid-3" style={{ marginBottom: 20 }}>
        <div className="d-card"><div className="d-card-label">Open Now</div><div className="d-card-value" style={{ color: "var(--green)" }}>{ipos.filter(i => i.status === "open").length}</div></div>
        <div className="d-card"><div className="d-card-label">Upcoming</div><div className="d-card-value" style={{ color: "#3b82f6" }}>{ipos.filter(i => i.status === "upcoming").length}</div></div>
        <div className="d-card"><div className="d-card-label">Recently Listed</div><div className="d-card-value">{ipos.filter(i => i.status === "listed").length}</div></div>
      </div>
      {ipos.map((ipo) => (
        <div key={ipo.name} className="d-card ipo-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, color: "var(--text-bright)", fontSize: 14, marginBottom: 6 }}>{ipo.name}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Price Band: <span style={{ color: "var(--text-body)" }}>{ipo.price}</span></span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{ipo.open} – {ipo.close}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="ipo-status-badge" style={{ background: statusColor[ipo.status] + "22", color: statusColor[ipo.status], border: `1px solid ${statusColor[ipo.status]}44` }}>
                {ipo.status.charAt(0).toUpperCase() + ipo.status.slice(1)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                GMP: <span style={{ color: "var(--green)", fontFamily: "Share Tech Mono,monospace" }}>{ipo.gmp}</span>
              </div>
            </div>
          </div>
          {ipo.status === "open" && (
            <button className="btn-xs buy" style={{ marginTop: 12, padding: "6px 18px", fontSize: 12 }}>Apply Now</button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Section: Orders ─── */
function SectionOrders({ orders }) {
  const statusColor = { COMPLETE: "#10b981", PENDING: "#f59e0b", REJECTED: "#ef4444" };
  return (
    <div className="d-section fade-in">
      <div className="d-page-title">📋 Orders</div>
      <div className="d-grid-3" style={{ marginBottom: 20 }}>
        <div className="d-card"><div className="d-card-label">Today's Orders</div><div className="d-card-value">{orders.length}</div></div>
        <div className="d-card"><div className="d-card-label">Executed</div><div className="d-card-value pos">{orders.filter(o => o.status === "COMPLETE").length}</div></div>
        <div className="d-card"><div className="d-card-label">Pending</div><div className="d-card-value" style={{ color: "#f59e0b" }}>{orders.filter(o => o.status === "PENDING").length}</div></div>
      </div>
      <div className="d-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="d-table-head">
          <span style={{ flex: 2 }}>Symbol</span>
          <span style={{ flex: 1, textAlign: "center" }}>Type</span>
          <span style={{ flex: 1, textAlign: "right" }}>Qty</span>
          <span style={{ flex: 2, textAlign: "right" }}>Price</span>
          <span style={{ flex: 2, textAlign: "right" }}>Status</span>
          <span style={{ flex: 1, textAlign: "right" }}>Time</span>
        </div>
        {orders.map((o, i) => (
          <div key={i} className="d-table-row">
            <div style={{ flex: 2, fontWeight: 700, color: "var(--text-bright)", fontSize: 13 }}>{o.sym}</div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <span className={`order-type-badge ${o.type === "BUY" ? "buy-badge" : "sell-badge"}`}>{o.type}</span>
            </div>
            <div style={{ flex: 1, textAlign: "right", fontFamily: "Share Tech Mono,monospace", color: "var(--text-body)", fontSize: 13 }}>{o.qty}</div>
            <div style={{ flex: 2, textAlign: "right", fontFamily: "Share Tech Mono,monospace", color: "var(--text-bright)", fontSize: 13 }}>₹{o.price.toFixed(2)}</div>
            <div style={{ flex: 2, textAlign: "right" }}>
              <span style={{ fontSize: 11, color: statusColor[o.status], fontWeight: 600, fontFamily: "Share Tech Mono,monospace" }}>● {o.status}</span>
            </div>
            <div style={{ flex: 1, textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>{o.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Section: Watchlist ─── */
function SectionWatchlist({ quotes }) {
  const [wl, setWl] = useState(["RELIANCE", "NIFTY 50", "TCS", "ADANI", "BAJFIN"]);
  const display = quotes.filter(q => wl.includes(q.label));
  const remove = (label) => setWl(prev => prev.filter(s => s !== label));
  return (
    <div className="d-section fade-in">
      <div className="d-page-title">⭐ Watchlist</div>
      <div className="d-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="d-table-head">
          <span style={{ flex: 2 }}>Symbol</span>
          <span style={{ flex: 2, textAlign: "right" }}>Price</span>
          <span style={{ flex: 1, textAlign: "right" }}>Chg%</span>
          <span style={{ flex: 2, textAlign: "right" }}>Chart</span>
          <span style={{ flex: 1, textAlign: "right" }}>Remove</span>
        </div>
        {display.length > 0 ? display.map((q) => (
          <div key={q.label} className="d-table-row">
            <div style={{ flex: 2, fontWeight: 700, color: "var(--text-bright)", fontSize: 13 }}>{q.label}</div>
            <div style={{ flex: 2, textAlign: "right", fontFamily: "Share Tech Mono,monospace", fontSize: 13, color: "var(--text-bright)" }}>
              ₹{Number(q.price).toLocaleString("en-IN")}
            </div>
            <div style={{ flex: 1, textAlign: "right" }} className={q.up ? "pos" : "neg"}>
              {q.up ? "▲" : "▼"} {Math.abs(q.changePct)}%
            </div>
            <div style={{ flex: 2, display: "flex", justifyContent: "flex-end" }}>
              <Sparkline up={q.up} />
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <button onClick={() => remove(q.label)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}>×</button>
            </div>
          </div>
        )) : (
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="d-table-row">
              {[2, 2, 1, 2, 1].map((flex, j) => <div key={j} style={{ flex }}><div className="sk" style={{ marginLeft: j > 0 ? "auto" : "0", width: "60%" }} /></div>)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Home({ onLogout }) {

const { stocks, mfHoldings, sips, ipos, orders, portfolio } = useData();

const [active, setActive] = useState("dashboard");
const [sideOpen, setSideOpen] = useState(true);

/* Get user info from localStorage */
const username = localStorage.getItem("username") || "Trader";
const role = localStorage.getItem("role");

/* Check admin role */
const isAdmin = role === "ADMIN";

const now = new Date();
const mktOpen = now.getHours() >= 9 && now.getHours() < 16;

/* Navigation items */
const baseNav = [
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "stocks", icon: "📊", label: "Stocks" },
  { id: "mutualfunds", icon: "🏦", label: "Mutual Funds" },
  { id: "sip", icon: "🔄", label: "SIP" },
  { id: "ipo", icon: "🚀", label: "IPO" },
  { id: "orders", icon: "📋", label: "Orders" },
  { id: "watchlist", icon: "⭐", label: "Watchlist" },
];
const NAV_ITEMS = isAdmin
  ? [...baseNav, { id: "admin", icon: "⚙️", label: "Admin Panel" }]
  : baseNav;

const Section = () => {
  switch (active) {
    case "dashboard":
      return <SectionDashboard quotes={stocks} portfolio={portfolio} />;
    case "stocks":
      return <SectionStocks quotes={stocks} />;
    case "mutualfunds":
      return <SectionMF holdings={mfHoldings} />;
    case "sip":
      return <SectionSIP sips={sips} />;
    case "ipo":
      return <SectionIPO ipos={ipos} />;
    case "orders":
      return <SectionOrders orders={orders} />;
    case "watchlist":
      return <SectionWatchlist quotes={stocks} />;
    case "admin":
      return <AdminPanel />;
    default:
      return <SectionDashboard quotes={stocks} portfolio={portfolio} />;
  }
};

return (
  <div className="dash-shell">
    {/* ── Sidebar ── */}
    <aside className={`dash-sidebar ${sideOpen ? "open" : "closed"}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-gem sm">📈</div>
        {sideOpen && <span className="logo-name sm">TRADE<em>PULSE</em></span>}
      </div>

      {/* Market status */}
      {sideOpen && (
        <div className="mkt-status-pill" style={{ background: mktOpen ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${mktOpen ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, color: mktOpen ? "var(--green)" : "var(--red)" }}>
          <span style={{ fontSize: 7 }}>●</span> {mktOpen ? "Market Open" : "Market Closed"} · <Clock />
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            {sideOpen && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="sidebar-footer">
        {sideOpen && (
          <div className="user-row">
            <div className="user-avatar">
              {username?.charAt(0)?.toUpperCase() || "T"}
            </div>
            <div className="user-info">
              <div className="user-name">{username}</div>
              <div className="user-sub">SEBI Verified</div>
            </div>
          </div>
        )}
        <button className="logout-btn-sm" onClick={onLogout} title="Sign Out">⏻</button>
      </div>
    </aside>

    {/* ── Main content ── */}
    <main className="dash-main">
      {/* Topbar */}
      <div className="dash-topbar">
        <button className="collapse-btn" onClick={() => setSideOpen(p => !p)}>
          {sideOpen ? "◀" : "▶"}
        </button>
        <div className="topbar-title">
          {NAV_ITEMS.find(n => n.id === active)?.label ?? "Dashboard"}
        </div>
        <div className="topbar-right">
          <div className="topbar-chip">
            <span className="dot-blink" style={{ background: "var(--green)" }} />
            {stocks.length > 0 ? `${stocks.length} stocks live` : "Loading…"}
          </div>
          <div className="topbar-chip">🔔</div>
          <div className="topbar-chip">⚙</div>
        </div>
      </div>

      {/* Section content */}
      <div className="dash-content">
        <Section />
      </div>
    </main>

    {/* ── Dashboard CSS (scoped inline) ── */}
    <style>{`
        /* Shell layout */
        .dash-shell {
          display: flex; height: 100vh; width: 100vw; overflow: hidden;
          position: fixed; inset: 0; z-index: 20;
        }

        /* Sidebar */
        .dash-sidebar {
          display: flex; flex-direction: column;
          background: rgba(2,5,20,0.85);
          border-right: 1px solid var(--glass-border-s);
          backdrop-filter: blur(32px);
          transition: width 0.3s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden; flex-shrink: 0; z-index: 30;
        }
        .dash-sidebar.open  { width: 220px; }
        .dash-sidebar.closed{ width: 64px; }

        .sidebar-logo {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 16px 16px; border-bottom: 1px solid var(--glass-border-s);
          flex-shrink: 0;
        }
        .logo-gem.sm { width:32px; height:32px; border-radius:10px; font-size:16px; flex-shrink:0; display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--sapphire),var(--royal)); box-shadow:0 0 16px rgba(37,99,235,0.4); }
        .logo-name.sm { font-size:17px; font-weight:800; color:var(--text-bright); white-space:nowrap; }
        .logo-name.sm em { font-style:normal; background:linear-gradient(90deg,var(--sapphire-l),var(--azure)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }

        .mkt-status-pill {
          margin: 10px 12px 4px; padding: 5px 10px; border-radius: 20px;
          font-size: 10px; font-weight: 600; display: flex; align-items: center; gap: 6px;
          flex-shrink: 0;
        }

        .sidebar-nav { flex:1; overflow-y:auto; padding:8px 8px; display:flex; flex-direction:column; gap:2px; }
        .sidebar-nav::-webkit-scrollbar { width:3px; }
        .sidebar-nav::-webkit-scrollbar-thumb { background:var(--glass-border); border-radius:4px; }

        .nav-item {
          display:flex; align-items:center; gap:12px; padding:10px 10px;
          border-radius:10px; border:none; background:transparent; cursor:pointer;
          color:var(--text-muted); font-family:'Sora',sans-serif; font-size:13px; font-weight:500;
          transition:all 0.2s; white-space:nowrap; text-align:left; width:100%;
        }
        .nav-item:hover { background:var(--glass-1); color:var(--text-body); }
        .nav-item.active {
          background:linear-gradient(135deg,rgba(37,99,235,0.25),rgba(79,70,229,0.25));
          color:var(--sky);
          border:1px solid rgba(37,99,235,0.25);
          box-shadow:0 0 12px rgba(37,99,235,0.15);
        }
        .nav-icon  { font-size:17px; flex-shrink:0; width:22px; text-align:center; }
        .nav-label { font-size:13px; }

        .sidebar-footer {
          padding:12px; border-top:1px solid var(--glass-border-s);
          display:flex; align-items:center; gap:10px; flex-shrink:0;
        }
        .user-row { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
        .user-avatar {
          width:32px; height:32px; border-radius:50%; flex-shrink:0;
          background:linear-gradient(135deg,var(--sapphire),var(--royal));
          display:flex; align-items:center; justify-content:center;
          font-size:14px; font-weight:700; color:#fff;
        }
        .user-info { min-width:0; }
        .user-name { font-size:12px; font-weight:700; color:var(--text-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .user-sub  { font-size:10px; color:var(--green); }
        .logout-btn-sm {
          background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2);
          border-radius:8px; padding:6px 8px; cursor:pointer; color:var(--red);
          font-size:14px; flex-shrink:0; transition:background 0.2s;
        }
        .logout-btn-sm:hover { background:rgba(239,68,68,0.18); }

        /* Main */
        .dash-main { flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden; }

        .dash-topbar {
          height:52px; display:flex; align-items:center; gap:14px; padding:0 20px;
          background:rgba(2,5,20,0.7); border-bottom:1px solid var(--glass-border-s);
          backdrop-filter:blur(20px); flex-shrink:0; z-index:20;
        }
        .collapse-btn {
          background:var(--glass-1); border:1px solid var(--glass-border-s);
          border-radius:7px; padding:4px 8px; cursor:pointer; color:var(--text-muted);
          font-size:11px; transition:all 0.2s;
        }
        .collapse-btn:hover { color:var(--text-bright); background:var(--glass-2); }
        .topbar-title { font-size:15px; font-weight:700; color:var(--text-bright); }
        .topbar-right { margin-left:auto; display:flex; align-items:center; gap:8px; }
        .topbar-chip {
          display:flex; align-items:center; gap:6px; padding:4px 12px;
          background:var(--glass-1); border:1px solid var(--glass-border-s);
          border-radius:20px; font-size:11px; color:var(--text-muted);
          backdrop-filter:blur(10px);
        }

        .dash-content {
          flex:1; overflow-y:auto; padding:24px 24px;
        }
        .dash-content::-webkit-scrollbar { width:4px; }
        .dash-content::-webkit-scrollbar-thumb { background:var(--glass-border); border-radius:4px; }

        /* Sections */
        .d-section { max-width:900px; }
        .d-page-title { font-size:20px; font-weight:800; color:var(--text-bright); margin-bottom:20px; }

        /* Cards */
        .d-card {
          background:var(--glass-1); border:1px solid var(--glass-border-s);
          border-radius:16px; padding:18px 20px; margin-bottom:16px;
          backdrop-filter:blur(24px);
          box-shadow:0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06);
          transition:border-color 0.2s;
        }
        .d-card:hover { border-color:var(--glass-border); }
        .accent-card {
          background:linear-gradient(135deg,rgba(37,99,235,0.12),rgba(79,70,229,0.12));
          border-color:rgba(37,99,235,0.25);
          box-shadow:0 4px 24px rgba(37,99,235,0.15), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .d-card-label { font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:1.2px; color:var(--text-muted); margin-bottom:8px; }
        .d-card-value { font-size:20px; font-weight:800; color:var(--text-bright); font-family:'Share Tech Mono',monospace; }
        .d-card-value.big { font-size:26px; }
        .d-card-sub { font-size:12px; margin-top:4px; }

        .d-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }

        /* Row for side-by-side panels */
        .d-row { display:flex; align-items:flex-start; }

        /* Market row items */
        .mkt-row-item {
          display:flex; align-items:center; gap:12px; padding:8px 12px;
          border-radius:10px; transition:background 0.15s;
        }
        .mkt-row-item:hover { background:var(--glass-2); }
        .mkt-row-item > div:first-child { flex:0 0 80px; }

        /* Quick actions */
        .quick-action {
          display:flex; flex-direction:column; align-items:center;
          padding:12px 16px; border-radius:12px; cursor:pointer;
          background:var(--glass-2); border:1px solid var(--glass-border-s);
          transition:all 0.2s; min-width:72px;
        }
        .quick-action:hover {
          background:rgba(from var(--qa-color) r g b / 0.12);
          border-color:rgba(from var(--qa-color) r g b / 0.35);
          transform:translateY(-2px);
          box-shadow:0 8px 20px rgba(0,0,0,0.2);
        }

        /* Subtabs */
        .d-subtabs { display:flex; gap:6px; margin-bottom:18px; flex-wrap:wrap; }
        .d-subtab {
          padding:6px 16px; border-radius:20px; border:1px solid var(--glass-border-s);
          background:transparent; cursor:pointer; font-family:'Sora',sans-serif;
          font-size:12px; font-weight:500; color:var(--text-muted); transition:all 0.2s;
        }
        .d-subtab:hover  { color:var(--text-body); border-color:var(--glass-border); }
        .d-subtab.active { background:rgba(37,99,235,0.2); color:var(--sky); border-color:rgba(37,99,235,0.4); }

        /* Tables */
        .d-table-head {
          display:flex; padding:10px 20px;
          background:rgba(0,0,0,0.2); border-bottom:1px solid var(--glass-border-s);
          font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);
        }
        .d-table-row {
          display:flex; align-items:center; padding:12px 20px;
          border-bottom:1px solid var(--glass-border-s); transition:background 0.15s;
        }
        .d-table-row:last-child { border-bottom:none; }
        .d-table-row:hover { background:var(--glass-1); }

        /* Buttons */
        .btn-xs {
          padding:4px 12px; border-radius:6px; font-family:'Sora',sans-serif;
          font-size:11px; font-weight:600; cursor:pointer; border:1px solid transparent;
          transition:all 0.15s;
        }
        .btn-xs.buy  { background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.3); color:var(--green); }
        .btn-xs.buy:hover  { background:rgba(16,185,129,0.28); }
        .btn-xs.sell { background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.3); color:var(--red); }
        .btn-xs.sell:hover { background:rgba(239,68,68,0.28); }
        .btn-full-primary {
          width:100%; padding:13px; background:linear-gradient(135deg,var(--sapphire),var(--royal));
          border:none; border-radius:11px; cursor:pointer; font-family:'Sora',sans-serif;
          font-size:14px; font-weight:700; color:#fff; transition:all 0.2s;
          box-shadow:0 4px 20px rgba(37,99,235,0.35);
        }
        .btn-full-primary:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(37,99,235,0.5); }

        /* Tags / badges */
        .tag-chip {
          padding:2px 8px; border-radius:20px; font-size:10px; font-weight:600;
          background:rgba(37,99,235,0.15); border:1px solid rgba(37,99,235,0.25); color:var(--sapphire-l);
        }
        .status-badge { font-size:10px; font-weight:600; font-family:'Share Tech Mono',monospace; }
        .status-badge.active { color:var(--green); }
        .status-badge.paused { color:#f59e0b; }
        .ipo-status-badge { font-size:10.5px; font-weight:600; padding:3px 10px; border-radius:20px; display:inline-block; }
        .order-type-badge { padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700; font-family:'Share Tech Mono',monospace; }
        .buy-badge  { background:rgba(16,185,129,0.15); color:var(--green); border:1px solid rgba(16,185,129,0.25); }
        .sell-badge { background:rgba(239,68,68,0.15); color:var(--red); border:1px solid rgba(239,68,68,0.25); }

        /* MF progress */
        .mf-progress-track { height:3px; background:rgba(255,255,255,0.06); border-radius:4px; margin:14px 0 8px; overflow:hidden; }
        .mf-progress-fill  { height:100%; background:linear-gradient(90deg,var(--sapphire),var(--azure)); border-radius:4px; }

        /* SIP */
        .sip-row { display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid var(--glass-border-s); }
        .sip-row:last-child { border-bottom:none; }
        .sip-status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .sip-status-dot.active { background:var(--green); box-shadow:0 0 6px var(--green); }
        .sip-status-dot.paused { background:#f59e0b; }

        /* IPO */
        .ipo-card { margin-bottom:14px; }

        /* Colors */
        .pos { color:var(--green); }
        .neg { color:var(--red); }
        .muted { color:var(--text-muted); }

        /* Skeleton */
        .sk {
          background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);
          background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:5px; height:12px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .d-grid-3 { grid-template-columns:1fr 1fr; }
          .d-row { flex-direction:column; }
          .dash-sidebar.open { width:180px; }
        }
      `}</style>
  </div>
);
}