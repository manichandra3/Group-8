import { useMemo, useState, useEffect } from "react";
import { useData } from "../context/DataContext";  // <-- import central data store
import Clock from "../components/Clock";
import AdminPanel from "../components/AdminPanel";   // <-- import admin panel component
import { getShareHistory } from "../stockService";

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

function PriceHistoryGraph({ series }) {
  const values = (series || []).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0);
  if (values.length === 0) return <Sparkline up={true} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const w = 72;
  const h = 22;

  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = values[values.length - 1] >= values[0];

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={up ? "#10b981" : "#ef4444"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Large Chart for Details Modal ─── */
function LargeHistoryChart({ series }) {
  const values = (series || []).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0);
  if (values.length === 0) return <div style={{color: "var(--text-muted)", padding: 20}}>No history available</div>;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const w = 500;
  const h = 200;

  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * (h - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = values[values.length - 1] >= values[0];
  const color = up ? "#10b981" : "#ef4444";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
        {/* Grid lines */}
        <line x1="0" y1="0" x2={w} y2="0" stroke="var(--glass-border-s)" strokeDasharray="4 4" />
        <line x1="0" y1={h} x2={w} y2={h} stroke="var(--glass-border-s)" strokeDasharray="4 4" />
        
        {/* The Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Start/End Dots */}
        {values.length > 0 && (
            <>
                <circle cx="0" cy={h - ((values[0] - min) / range) * (h - 20) - 10} r="4" fill={color} />
                <circle cx={w} cy={h - ((values[values.length-1] - min) / range) * (h - 20) - 10} r="4" fill={color} />
            </>
        )}
      </svg>
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)", fontFamily: "Share Tech Mono, monospace" }}>
        <span>Low: ₹{min.toFixed(2)}</span>
        <span>High: ₹{max.toFixed(2)}</span>
      </div>
    </div>
  );
}

/* ─── Stock Details Modal ─── */
function StockDetailsModal({ isOpen, onClose, stock, history }) {
  if (!isOpen || !stock) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{stock.label} <span style={{fontSize: 12, color: "var(--text-muted)", marginLeft: 8}}>NSE</span></h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body">
            <div style={{display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "flex-end"}}>
                <div>
                    <div style={{fontSize: 12, color: "var(--text-muted)"}}>Current Price</div>
                    <div style={{fontSize: 28, fontWeight: 800, fontFamily: "Share Tech Mono, monospace", color: "var(--text-bright)"}}>
                        ₹{Number(stock.price).toLocaleString("en-IN")}
                    </div>
                </div>
                 <div className={stock.up ? "pos" : "neg"} style={{fontSize: 16, fontWeight: 600}}>
                    {stock.up ? "▲" : "▼"} {Math.abs(stock.changePct)}%
                 </div>
            </div>
            
            <div style={{ background: "var(--glass-1)", padding: 20, borderRadius: 12, border: "1px solid var(--glass-border-s)" }}>
                <LargeHistoryChart series={history} />
            </div>

            <div style={{marginTop: 20, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5}}>
                <p>Company: <strong style={{color: "var(--text-bright)"}}>{stock.label}</strong></p>
                <p>Exchange: NSE</p>
                <p>Sector: Equity</p>
            </div>
        </div>
      </div>
      <style>{`
        .modal-content.large {
            max-width: 600px;
        }
      `}</style>
    </div>
  );
}

/* ─── Trade Modal ─── */
function TradeModal({ isOpen, onClose, type, stock, onConfirm }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !stock) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onConfirm({
      type,
      companySymbol: stock.label,
      quantity: Number(qty),
      pricePerShare: Number(stock.price)
    });
    setLoading(false);
    onClose();
  };

  const total = (Number(qty) * Number(stock.price)).toFixed(2);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{type === "BUY" ? "Buy Shares" : "Sell Shares"}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="stock-info">
              <span className="stock-label">{stock.label}</span>
              <span className="stock-price">₹{stock.price}</span>
            </div>
            
            <div className="form-group">
              <label>Quantity</label>
              <input 
                type="number" 
                min="1" 
                value={qty} 
                onChange={(e) => setQty(e.target.value)}
                className="modal-input"
                autoFocus
              />
            </div>

            <div className="summary-row">
              <span>Total Amount</span>
              <span className="total-val">₹{total}</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className={`btn-confirm ${type === "BUY" ? "buy" : "sell"}`} disabled={loading}>
              {loading ? "Processing..." : type}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px); z-index: 100;
          display: flex; align-items: center; justify-content: center;
        }
        .modal-content {
          background: #0f172a; border: 1px solid var(--glass-border);
          border-radius: 16px; width: 100%; max-width: 360px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          animation: slideUp 0.2s ease-out;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; border-bottom: 1px solid var(--glass-border-s);
        }
        .modal-header h3 { margin: 0; font-size: 16px; color: var(--text-bright); }
        .close-btn { background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; }
        .modal-body { padding: 20px; }
        .stock-info {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px; padding: 12px; background: var(--glass-1);
          border-radius: 8px;
        }
        .stock-label { font-weight: 700; color: var(--text-bright); }
        .stock-price { font-family: 'Share Tech Mono', monospace; color: var(--text-body); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
        .modal-input {
          width: 100%; background: var(--glass-2); border: 1px solid var(--glass-border-s);
          padding: 10px; border-radius: 8px; color: var(--text-bright);
          font-family: 'Share Tech Mono', monospace; font-size: 16px;
        }
        .summary-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted); }
        .total-val { color: var(--text-bright); font-weight: 700; font-family: 'Share Tech Mono', monospace; }
        .modal-footer {
          padding: 16px 20px; border-top: 1px solid var(--glass-border-s);
          display: flex; justify-content: flex-end; gap: 10px;
        }
        .btn-cancel {
          background: transparent; border: 1px solid var(--glass-border-s);
          color: var(--text-muted); padding: 8px 16px; border-radius: 8px; cursor: pointer;
        }
        .btn-confirm {
          padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none;
          color: #fff;
        }
        .btn-confirm.buy { background: var(--green); }
        .btn-confirm.sell { background: var(--red); }
        .btn-confirm:disabled { opacity: 0.7; cursor: not-allowed; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

/* ─── Donut chart (pure SVG) ─── */
function DonutChart({ data }) {
  const r = 44, cx = 52, cy = 52, stroke = 11;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const colors = ["#3b82f6", "#06b6d4", "#a855f7", "#10b981", "#f59e0b"];
  return (
    <svg width={104} height={104}>
      {data.map((d, i) => {
        const dash = (d.value / total) * circ;
        const gap = circ - dash;
        const offset = data
          .slice(0, i)
          .reduce((acc, prev) => acc + ((prev.value / total) * circ) + 2, 0);
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={colors[i % colors.length]} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
        );
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
function SectionDashboard({ quotes, portfolio, activePortfolio, onStockClick }) {
  const up = portfolio.todayPnl >= 0;
  const top = quotes.slice(0, 6);
  const donutData = (activePortfolio?.holdings || [])
    .map((h) => {
      const quote = quotes.find((q) => q.label === h.companySymbol);
      const ltp = quote ? Number(quote.price) : Number(h.averagePrice || 0);
      return {
        label: h.companySymbol,
        value: (Number(h.quantity || 0) * ltp),
      };
    })
    .filter((d) => d.value > 0)
    .slice(0, 5);
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
            <DonutChart data={donutData.length > 0 ? donutData : [{ label: "Portfolio", value: Number(portfolio.current || 0) }]} />
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
                <div key={q.label} className="mkt-row-item" onClick={() => onStockClick(q)} style={{cursor: "pointer"}}>
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
            { icon: "📈", label: "Buy Shares", color: "#3b82f6" },
            { icon: "📉", label: "Sell Shares", color: "#ef4444" },
            { icon: "📊", label: "View Orders", color: "#10b981" },
            { icon: "⭐", label: "Open Watchlist", color: "#f59e0b" },
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
function SectionStocks({ quotes, portfolio, orders, historyData, onStockClick }) {
  const { addOrder } = useData();
  const [tab, setTab] = useState("holdings");
  const [modalOpen, setModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState("BUY");
  const [selectedStock, setSelectedStock] = useState(null);

  const openTrade = (type, stock, e) => {
    e.stopPropagation(); // Prevent opening details
    setTradeType(type);
    setSelectedStock(stock);
    setModalOpen(true);
  };

  const holdings = quotes.filter(q => ["RELIANCE", "TCS", "INFY", "WIPRO", "ITC"].includes(q.label));
  const watchlist = quotes.filter(q => ["BAJFIN", "ADANI", "HDFCBANK"].includes(q.label));
  // Fallback for demo if filters exclude everything or specific tabs selected
  let display = tab === "holdings" ? holdings : watchlist;
  if (display.length === 0 && quotes.length > 0) display = quotes; 

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
        <div className="d-card"><div className="d-card-label">Invested</div><div className="d-card-value">₹{Number(portfolio.invested || 0).toLocaleString("en-IN")}</div></div>
        <div className="d-card"><div className="d-card-label">Current</div><div className="d-card-value pos">₹{Number(portfolio.current || 0).toLocaleString("en-IN")}</div></div>
        <div className="d-card"><div className="d-card-label">P&L</div><div className="d-card-value pos">₹{Number(portfolio.totalPnl || 0).toLocaleString("en-IN")} ({Number(portfolio.totalPct || 0).toFixed(2)}%)</div></div>
      </div>

      {/* Table */}
      <div className="d-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="d-table-head">
          <span style={{ flex: 2 }}>Stock</span>
          <span style={{ flex: 1, textAlign: "right" }}>LTP</span>
          <span style={{ flex: 1, textAlign: "right" }}>Chg%</span>
          <span style={{ flex: 1, textAlign: "right" }}>Price History</span>
          <span style={{ flex: 1, textAlign: "right" }}>Action</span>
        </div>
        {display.length > 0 ? display.map((q) => (
          <div key={q.label} className="d-table-row" onClick={() => onStockClick(q)} style={{cursor: "pointer"}}>
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
              <PriceHistoryGraph series={historyData[q.label] || [Number(q.price)]} />
            </div>
            <div style={{ flex: 1, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button className="btn-xs buy" onClick={(e) => openTrade("BUY", q, e)}>BUY</button>
              <button className="btn-xs sell" onClick={(e) => openTrade("SELL", q, e)}>SELL</button>
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

      {modalOpen && (
        <TradeModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)}
          type={tradeType}
          stock={selectedStock}
          onConfirm={addOrder}
        />
      )}
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
function SectionWatchlist({ quotes, onStockClick }) {
  const [wl, setWl] = useState(["RELIANCE", "NIFTY 50", "TCS", "ADANI", "BAJFIN"]);
  const display = quotes.filter(q => wl.includes(q.label));
  const remove = (label, e) => {
      e.stopPropagation();
      setWl(prev => prev.filter(s => s !== label));
  }
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
          <div key={q.label} className="d-table-row" onClick={() => onStockClick(q)} style={{cursor: "pointer"}}>
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
              <button onClick={(e) => remove(q.label, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}>×</button>
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

const { stocks, orders, portfolio, activePortfolio } = useData();

const [active, setActive] = useState("dashboard");
const [sideOpen, setSideOpen] = useState(true);
const [historyData, setHistoryData] = useState({});

// Details Modal State
const [detailsOpen, setDetailsOpen] = useState(false);
const [selectedDetails, setSelectedDetails] = useState(null);

/* Get user info from localStorage */
const username = localStorage.getItem("username") || "Trader";
const role = localStorage.getItem("role");

/* Check admin role */
const isAdmin = role === "ADMIN";

const now = new Date();
const mktOpen = now.getHours() >= 9 && now.getHours() < 16;

const openDetails = (stock) => {
    setSelectedDetails(stock);
    setDetailsOpen(true);
}

// Fetch history for all stocks at Home level so it's available for all sections
useEffect(() => {
    const fetchHistory = async () => {
      const data = {};
      await Promise.all(stocks.map(async (q) => {
        if (q.id) {
          try {
            const hist = await getShareHistory(q.id);
            // Backend returns DESC (newest first). Reverse for graph (oldest -> newest).
            data[q.label] = hist.map(h => h.price).reverse();
            // Append current price to show the latest point
            if (q.price) data[q.label].push(Number(q.price));
          } catch (e) {
            console.error("Failed to fetch history for " + q.label, e);
          }
        }
      }));
      setHistoryData(data);
    };

    if (stocks.length > 0) {
      fetchHistory();
    }
}, [stocks]); // Re-fetch only if stock list changes

/* Navigation items */
const baseNav = [
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "stocks", icon: "📊", label: "Stocks" },
  { id: "orders", icon: "📋", label: "Orders" },
  { id: "watchlist", icon: "⭐", label: "Watchlist" },
];
const NAV_ITEMS = isAdmin
  ? [...baseNav, { id: "admin", icon: "⚙️", label: "Admin Panel" }]
  : baseNav;

const renderSection = () => {
  switch (active) {
    case "dashboard":
      return <SectionDashboard quotes={stocks} portfolio={portfolio} activePortfolio={activePortfolio} onStockClick={openDetails} />;
    case "stocks":
      return <SectionStocks quotes={stocks} portfolio={portfolio} orders={orders} historyData={historyData} onStockClick={openDetails} />;
    case "orders":
      return <SectionOrders orders={orders} />;
    case "watchlist":
      return <SectionWatchlist quotes={stocks} onStockClick={openDetails} />;
    case "admin":
      return <AdminPanel />;
    default:
      return <SectionDashboard quotes={stocks} portfolio={portfolio} activePortfolio={activePortfolio} onStockClick={openDetails} />;
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
        {renderSection()}
      </div>
    </main>

    {/* Details Modal (Global) */}
    {detailsOpen && selectedDetails && (
        <StockDetailsModal 
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        stock={selectedDetails}
        history={historyData[selectedDetails.label]}
        />
    )}

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
        /* Tags / badges */
        .order-type-badge { padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700; font-family:'Share Tech Mono',monospace; }
        .buy-badge  { background:rgba(16,185,129,0.15); color:var(--green); border:1px solid rgba(16,185,129,0.25); }
        .sell-badge { background:rgba(239,68,68,0.15); color:var(--red); border:1px solid rgba(239,68,68,0.25); }

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
