import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useExchange, TRADE_API, getLive } from "../hooks/useExchange";

const STOCK_API     = axios.create({ baseURL: "http://localhost:8085/api" });
const PORTFOLIO_API = axios.create({ baseURL: "http://localhost:8085/api" });

PORTFOLIO_API.interceptors.request.use(cfg => {
  const uid = localStorage.getItem("userId");
  if (uid) {
    cfg.headers["X-User-Id"]    = uid;
    cfg.headers["X-User-Name"]  = localStorage.getItem("username")  || "";
    cfg.headers["X-User-Email"] = localStorage.getItem("userEmail") || "";
  }
  return cfg;
});

const AUTH_API = axios.create({ baseURL: "http://localhost:8081" });

const teal   = "#00d4a0";
const red    = "#ff5a6a";
const blue   = "#00b8ff";
const amber  = "#fbbf24";
const purple = "#a78bfa";

function fmt(n, d = 2) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCap(n) {
  if (n >= 1e9) return `₹${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `₹${(n / 1e6).toFixed(2)}M`;
  return `₹${n.toLocaleString()}`;
}
function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

function defaultLive(c) {
  const price = c.lastPrice || 0;
  const open  = c.openingPrice || price;
  return {
    companyId:    c.id,
    companyName:  c.name,
    price,
    open,
    high:         (c.dayHigh  > 0) ? c.dayHigh  : price,
    low:          (c.dayLow   > 0) ? c.dayLow   : price,
    dayChangePct: 0,
    tickChangePct:0,
    history:      [price],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY — prevents one crash from blanking the whole screen
// ─────────────────────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding:"32px", textAlign:"center", color:"#ff5a6a", fontFamily:"'DM Mono',monospace" }}>
          <div style={{ fontSize:24, marginBottom:10 }}>⚠</div>
          <div style={{ fontSize:12, letterSpacing:2, marginBottom:8 }}>RENDER ERROR</div>
          <div style={{ fontSize:10, color:"#3a4a6a", marginBottom:16 }}>{this.state.error?.message}</div>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ background:"rgba(255,90,106,0.1)", border:"1px solid rgba(255,90,106,0.3)", color:"#ff5a6a", padding:"8px 18px", borderRadius:7, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2 }}>
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE CHART
// ─────────────────────────────────────────────────────────────────────────────
function InteractiveChart({ history = [], open, high, low, height = 180 }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const COORD_W = 1000;

  const PAD_L = 80, PAD_R = 14, PAD_T = 14, PAD_B = 28;
  const W = COORD_W - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  // Guard: need at least 2 data points and valid dimensions
  if (history.length < 2 || W <= 0 || H <= 0) {
    return (
      <div style={{ width:"100%", height, display:"flex", alignItems:"center", justifyContent:"center", color:"#4a5a7a", fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>
        AWAITING DATA…
      </div>
    );
  }

  const pMin = Math.min(...history) * 0.9985;
  const pMax = Math.max(...history) * 1.0015;
  const pRng = pMax - pMin || 1;

  const px = (i) => PAD_L + (i / (history.length - 1)) * W;
  const py = (v) => PAD_T + H - ((v - pMin) / pRng) * H;

  const linePts  = history.map((v,i) => `${px(i)},${py(v)}`).join(" ");
  const areaPath = `M${px(0)},${py(history[0])} ` +
    history.map((v,i) => `L${px(i)},${py(v)}`).join(" ") +
    ` L${px(history.length-1)},${PAD_T+H} L${px(0)},${PAD_T+H} Z`;

  const isUp  = history[history.length-1] >= history[0];
  const color = isUp ? teal : red;

  const yTicks = Array.from({length:5}, (_,i) => ({
    v: pMin + (pRng * i) / 4,
    y: py(pMin + (pRng * i) / 4),
  }));

  const xStep  = Math.max(1, Math.floor(history.length / 6));
  const xTicks = history.map((_,i)=>i).filter(i => i % xStep === 0 || i === history.length-1);
  const openY  = open > 0 ? py(Math.min(Math.max(open, pMin), pMax)) : null;
  const uid    = `ch${COORD_W}`;

  const handleMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    // Convert from screen px to SVG coordinate space
    const scaleX = COORD_W / rect.width;
    const svgMx  = mx * scaleX;
    if (svgMx < PAD_L || svgMx > PAD_L + W) { setHover(null); return; }
    const idx = Math.round(((svgMx - PAD_L) / W) * (history.length - 1));
    const i   = Math.max(0, Math.min(history.length - 1, idx));
    const price = history[i];
    const pct   = ((price - history[0]) / history[0]) * 100;
    setHover({ x: px(i), y: py(price), idx: i, price, pct });
  }, [history, W, H]);

  return (
    <div style={{ position:"relative", userSelect:"none" }}>
      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${COORD_W} ${height}`}
        style={{ display:"block", cursor:"crosshair" }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`${uid}f`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id={`${uid}l`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor={color} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={color} stopOpacity="1"/>
          </linearGradient>
          <clipPath id={`${uid}c`}>
            <rect x={PAD_L} y={PAD_T} width={W} height={H}/>
          </clipPath>
        </defs>

        {yTicks.map((t,i) => (
          <line key={i} x1={PAD_L} y1={t.y} x2={PAD_L+W} y2={t.y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        ))}

        {openY && <line x1={PAD_L} y1={openY} x2={PAD_L+W} y2={openY} stroke={amber} strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>}

        <path d={areaPath} fill={`url(#${uid}f)`} clipPath={`url(#${uid}c)`}/>
        <polyline points={linePts} fill="none" stroke={`url(#${uid}l)`} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${uid}c)`}/>

        {yTicks.map((t,i) => (
          <text key={i} x={PAD_L-6} y={t.y+4} textAnchor="end" fontSize="8.5" fill="rgba(255,255,255,0.2)" fontFamily="'DM Mono',monospace">{fmt(t.v,0)}</text>
        ))}

        {openY && <text x={PAD_L+W+3} y={openY+3.5} fontSize="8" fill={amber} fontFamily="'DM Mono',monospace" opacity="0.7">OPEN</text>}

        {xTicks.map(i => (
          <text key={i} x={px(i)} y={PAD_T+H+18} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.15)" fontFamily="'DM Mono',monospace">T-{history.length-1-i}s</text>
        ))}

        {!hover && (
          <circle cx={px(history.length-1)} cy={py(history[history.length-1])} r="3.5" fill={color} style={{filter:`drop-shadow(0 0 4px ${color})`}}/>
        )}

        {hover && (
          <>
            <line x1={hover.x} y1={PAD_T} x2={hover.x} y2={PAD_T+H} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3"/>
            <line x1={PAD_L} y1={hover.y} x2={PAD_L+W} y2={hover.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3,3"/>
            <rect x={2} y={hover.y-9} width={PAD_L-5} height={16} rx="3" fill="#0a1020" stroke={color} strokeWidth="0.8" opacity="0.9"/>
            <text x={PAD_L-8} y={hover.y+4} textAnchor="end" fontSize="8.5" fill={color} fontFamily="'DM Mono',monospace">{fmt(hover.price,2)}</text>
            <circle cx={hover.x} cy={hover.y} r="4" fill={color} style={{filter:`drop-shadow(0 0 5px ${color})`}}/>
            <circle cx={hover.x} cy={hover.y} r="7" fill={color} opacity="0.15"/>
          </>
        )}
      </svg>

      {hover && (() => {
        const hUp = hover.pct >= 0;
        const c   = hUp ? teal : red;
        const flip= hover.x > COORD_W * 0.65;
        return (
          <div style={{ position:"absolute", top:Math.max(4,hover.y-52), left:flip?hover.x-148:hover.x+10, background:"#0a1525", border:`1px solid ${c}55`, borderRadius:8, padding:"9px 14px", pointerEvents:"none", zIndex:10, minWidth:130, boxShadow:"0 4px 24px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize:16, fontWeight:800, color:c, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:-0.5 }}>₹{fmt(hover.price)}</div>
            <div style={{ fontSize:10, color:hUp?teal:red, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{hUp?"▲ +":"▼ "}{hover.pct.toFixed(3)}%</div>
            <div style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace", marginTop:4, letterSpacing:1 }}>T-{history.length-1-hover.idx}s ago</div>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDLE CHART — fully fixed
// ─────────────────────────────────────────────────────────────────────────────
function CandleChart({ candles = [], height = 160 }) {
  const [hover, setHover] = useState(null);
  const COORD_W = 1000;

  const PAD_L=10, PAD_R=10, PAD_T=10, PAD_B=24;
  const W = COORD_W - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  // Guard: no candles or invalid dimensions
  if (!candles.length || W <= 0 || H <= 0) {
    return (
      <div style={{ width:"100%", height, display:"flex", alignItems:"center", justifyContent:"center", color:"#4a5a7a", fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>
        NO CANDLE DATA
      </div>
    );
  }

  // Guard: filter out candles with invalid prices
  const validCandles = candles.filter(c =>
    isFinite(c.open) && isFinite(c.close) && isFinite(c.high) && isFinite(c.low)
  );

  if (!validCandles.length) {
    return (
      <div style={{ width:"100%", height, display:"flex", alignItems:"center", justifyContent:"center", color:"#4a5a7a", fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>
        NO VALID CANDLE DATA
      </div>
    );
  }

  const allPrices = validCandles.flatMap(c => [c.open, c.close, c.high, c.low]);
  const pMax = Math.max(...allPrices) * 1.002;
  const pMin = Math.min(...allPrices) * 0.998;
  const pRng = pMax - pMin || 1;  // prevent division by zero

  const py   = (v) => PAD_T + H - ((v - pMin) / pRng) * H;
  const barW = Math.max(2, Math.floor((W / validCandles.length) * 0.7));
  const gap  = W / validCandles.length;

  return (
    <div style={{ position:"relative", userSelect:"none" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${COORD_W} ${height}`}
        style={{ display:"block" }}
        onMouseLeave={() => setHover(null)}>
        {validCandles.map((c, i) => {
          const cx = PAD_L + i * gap + gap / 2;
          const isUp = c.close >= c.open;
          const col  = isUp ? teal : red;
          const bodyTop = py(Math.max(c.open, c.close));
          const bodyH   = Math.max(1, py(Math.min(c.open, c.close)) - bodyTop);
          return (
            <g key={i}
              onMouseEnter={() => setHover({ c, cx })}
              style={{ cursor:"crosshair" }}>
              <line x1={cx} y1={py(c.high)} x2={cx} y2={py(c.low)} stroke={col} strokeWidth="1" opacity="0.6"/>
              <rect x={cx-barW/2} y={bodyTop} width={barW} height={bodyH}
                fill={isUp?`${col}30`:`${col}50`} stroke={col} strokeWidth="1" rx="1"/>
            </g>
          );
        })}

        {/* X-axis time labels */}
        {validCandles
          .filter((_,i) => i % Math.max(1, Math.floor(validCandles.length/6)) === 0)
          .map((c, i) => {
            const idx = validCandles.indexOf(c);
            const cx  = PAD_L + idx * gap + gap / 2;
            return (
              <text key={i} x={cx} y={PAD_T+H+18}
                textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.15)"
                fontFamily="'DM Mono',monospace">
                {fmtTime(c.startTime).slice(0,5)}
              </text>
            );
          })
        }
      </svg>

      {/* Hover tooltip — uses COORD_W for flip detection, no undefined `width` */}
      {hover && (() => {
        const isUp = hover.c.close >= hover.c.open;
        const col  = isUp ? teal : red;
        const flip = hover.cx > COORD_W * 0.6;   // ← FIXED: was `width` (undefined)
        return (
          <div style={{
            position:"absolute", top:8,
            left:  flip ? "auto" : `calc(${(hover.cx / COORD_W) * 100}% + 10px)`,
            right: flip ? `calc(${((COORD_W - hover.cx) / COORD_W) * 100}% + 10px)` : "auto",
            background:"#0a1525",
            border:`1px solid ${col}55`,
            borderRadius:8, padding:"10px 14px",
            pointerEvents:"none", zIndex:10,
            minWidth:160,
            boxShadow:"0 4px 20px rgba(0,0,0,0.6)"
          }}>
            <div style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace", letterSpacing:2, marginBottom:6 }}>
              {fmtTime(hover.c.startTime)} · 1m
            </div>
            {[
              ["O", hover.c.open,  "#c8d4f0"],
              ["H", hover.c.high,  teal],
              ["L", hover.c.low,   red],
              ["C", hover.c.close, col],
            ].map(([lbl, val, c]) => (
              <div key={lbl} style={{ display:"flex", justifyContent:"space-between", gap:16, marginBottom:2 }}>
                <span style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace" }}>{lbl}</span>
                <span style={{ fontSize:12, fontWeight:600, color:c, fontFamily:"'DM Mono',monospace" }}>₹{fmt(val)}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RSI GAUGE
// ─────────────────────────────────────────────────────────────────────────────
function RsiGauge({ rsi }) {
  if (rsi == null || !isFinite(rsi)) return null;
  const color = rsi >= 70 ? red : rsi <= 30 ? teal : "#c8d4f0";
  const label = rsi >= 70 ? "OVERBOUGHT" : rsi <= 30 ? "OVERSOLD" : "NEUTRAL";
  const angle = (Math.min(Math.max(rsi, 0), 100) / 100) * 180 - 90;
  const rad   = (angle - 90) * Math.PI / 180;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={120} height={66} viewBox="0 0 120 66">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round"/>
        <path d="M 10 60 A 50 50 0 0 1 35 17"  fill="none" stroke={`${teal}44`} strokeWidth="8" strokeLinecap="round"/>
        <path d="M 85 17 A 50 50 0 0 1 110 60" fill="none" stroke={`${red}44`}  strokeWidth="8" strokeLinecap="round"/>
        <path d={`M 10 60 A 50 50 0 0 1 ${60+50*Math.cos(rad)} ${60+50*Math.sin(rad)}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.9"/>
        <line x1="60" y1="60" x2={60+38*Math.cos(rad)} y2={60+38*Math.sin(rad)} stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="60" cy="60" r="4" fill={color}/>
        <text x="8"   y="76" fontSize="7" fill={`${teal}88`} fontFamily="'DM Mono',monospace">30</text>
        <text x="100" y="76" fontSize="7" fill={`${red}88`}  fontFamily="'DM Mono',monospace">70</text>
      </svg>
      <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:20, fontWeight:800, color, letterSpacing:-0.5 }}>{rsi.toFixed(1)}</div>
      <div style={{ fontSize:9, color, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE HISTORY TABLE
// ─────────────────────────────────────────────────────────────────────────────
function PriceHistoryTable({ rows = [] }) {
  if (!rows.length) return <div style={{ padding:20, textAlign:"center", color:"#4a5a7a", fontSize:11, fontFamily:"'DM Mono',monospace" }}>NO HISTORY</div>;
  return (
    <div style={{ maxHeight:220, overflowY:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ borderBottom:"1px solid #0e1828", position:"sticky", top:0, background:"#060d1a" }}>
            {["Time","Price","Δ"].map(h => (
              <th key={h} style={{ padding:"7px 12px", fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", textAlign:h!=="Time"?"right":"left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rows].reverse().slice(0,20).map((row, i, arr) => {
            const prev  = arr[i+1];
            const delta = prev ? row.price - prev.price : 0;
            const up    = delta >= 0;
            return (
              <tr key={row.id||i} style={{ borderBottom:"1px solid rgba(255,255,255,0.02)" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"7px 12px", fontSize:10, color:"#3a4a6a", fontFamily:"'DM Mono',monospace" }}>{fmtTime(row.timestamp)}</td>
                <td style={{ padding:"7px 12px", fontSize:12, fontWeight:600, color:"#c8d4f0", fontFamily:"'DM Mono',monospace", textAlign:"right" }}>₹{fmt(row.price)}</td>
                <td style={{ padding:"7px 12px", fontSize:10, color:up?teal:red, fontFamily:"'DM Mono',monospace", textAlign:"right" }}>{prev?`${up?"+":""}${delta.toFixed(2)}`:"—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WALLET BALANCE HINT
// ─────────────────────────────────────────────────────────────────────────────
function WalletBalanceHint({ isBuy, pfMode, qty, price }) {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    PORTFOLIO_API.get("/wallet/balance")
      .then(r => setBalance(parseFloat(r.data.balance)))
      .catch(() => setBalance(null));
  }, []);

  if (!isBuy || balance === null) return null;

  const total     = price * (parseInt(qty) || 0);
  const canAfford = balance >= total;
  const color     = canAfford ? teal : red;

  return (
    <div style={{ marginBottom:10, padding:"9px 12px", background: canAfford ? "rgba(0,212,160,0.06)" : "rgba(255,90,106,0.06)", border:`1px solid ${color}33`, borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:2 }}>
          {pfMode ? "Wallet" : "Wallet Balance"}
        </div>
        <div style={{ fontSize:13, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>
          ₹{fmt(balance)}
        </div>
      </div>
      {total > 0 && (
        <div style={{ textAlign:"right" }}>
          {canAfford ? (
            <div style={{ fontSize:10, color:teal, fontFamily:"'DM Mono',monospace" }}>✓ Sufficient</div>
          ) : (
            <>
              <div style={{ fontSize:10, color:red, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>⚠ Insufficient</div>
              <div style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace", marginTop:2 }}>
                Need ₹{fmt(total - balance)} more
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER PANEL
// ─────────────────────────────────────────────────────────────────────────────
function OrderPanel({ company, livePrice, tradeCompanyId }) {
  const effectiveCompanyId = tradeCompanyId || company.id;

  const [side,        setSide]        = useState("BUY");
  const [orderType,   setOrderType]   = useState("MARKET");
  const [qty,         setQty]         = useState("1");
  const [limitPx,     setLimitPx]     = useState("");
  const [triggerPx,   setTriggerPx]   = useState("");
  const [status,      setStatus]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [portfolios,  setPortfolios]  = useState([]);
  const [portfolioId, setPortfolioId] = useState("");

  const userId = parseInt(localStorage.getItem("userId") || "1", 10);
  const isBuy  = side === "BUY";
  const c      = isBuy ? teal : red;

  useEffect(() => {
    PORTFOLIO_API.get("/portfolios")
      .then(r => { setPortfolios(Array.isArray(r.data) ? r.data : []); })
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!qty || parseInt(qty) < 1) return;
    if (!effectiveCompanyId) {
      setStatus({ ok:false, msg:"Company not found in trade-service." });
      return;
    }

    setLoading(true); setStatus(null);

    try {
      const body = {
        userId:    userId,
        companyId: effectiveCompanyId,
        quantity:  parseInt(qty),
        orderType,
      };
      if ((orderType === "LIMIT" || orderType === "STOPLOSS/TARGET") && limitPx)
        body.price = parseFloat(limitPx);
      if (orderType === "STOPLOSS/TARGET" && triggerPx)
        body.triggerPrice = parseFloat(triggerPx);

      const tradeRes = await TRADE_API.post(
        isBuy ? "/trade/buy" : "/trade/sell",
        body
      );

      const executedPrice = tradeRes.data.price;
      let   msg           = `Order #${tradeRes.data.id} ${tradeRes.data.status} at ₹${fmt(executedPrice)}`;

      if (portfolioId && tradeRes.data.status === "EXECUTED") {
        try {
          const pfBody = {
            portfolioId:   parseInt(portfolioId),
            companySymbol: company.symbol || company.name.substring(0, 6).toUpperCase(),
            quantity:      parseInt(qty),
            pricePerShare: executedPrice,
          };
          const endpoint = isBuy ? "/transactions/buy" : "/transactions/sell";
          await PORTFOLIO_API.post(endpoint, pfBody);
          const pfName = portfolios.find(p => String(p.id) === String(portfolioId))?.name || "portfolio";
          msg += ` · Added to "${pfName}"`;
        } catch (pfErr) {
          msg += ` · (Portfolio sync failed: ${pfErr.response?.data?.message || "check portfolio service"})`;
        }
      }

      setStatus({ ok:true, msg });
      setQty("1"); setLimitPx(""); setTriggerPx("");

    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.error || "Order failed";
      setStatus({ ok:false, msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display:"flex", marginBottom:14, borderRadius:9, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.02)" }}>
        {["BUY","SELL"].map(s => (
          <button key={s} onClick={()=>setSide(s)}
            style={{ flex:1, padding:"11px", border:"none", fontFamily:"'DM Mono',monospace", fontSize:12, letterSpacing:2, fontWeight:700, cursor:"pointer", transition:"all 0.18s",
              background: side===s ? (s==="BUY" ? "rgba(0,212,160,0.2)" : "rgba(255,90,106,0.2)") : "transparent",
              color:      side===s ? (s==="BUY" ? teal : red) : "#3a4a6a",
            }}>
            {s === "BUY" ? "▲ BUY" : "▼ SELL"}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:14 }}>
        {["MARKET","LIMIT","STOPLOSS/TARGET"].map(t => (
          <button key={t} onClick={()=>setOrderType(t)}
            style={{ flex:1, padding:"7px 4px", border:`1px solid ${orderType===t ? c+"55" : "rgba(255,255,255,0.07)"}`, borderRadius:7, background:orderType===t ? `${c}12` : "transparent", color:orderType===t ? c : "#3a4a6a", fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:0.8, cursor:"pointer", transition:"all 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ background:"rgba(6,13,26,0.7)", borderRadius:9, padding:"10px 14px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>MARKET PRICE</span>
        <span style={{ fontSize:18, fontWeight:800, color:c, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:-0.5 }}>₹{fmt(livePrice)}</span>
      </div>

      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:5 }}>Quantity</label>
        <input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="1" min="1"
          style={{ background:"rgba(6,13,26,0.7)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"10px 12px", color:"#eef0f8", fontFamily:"'DM Mono',monospace", fontSize:14, width:"100%", outline:"none" }}
          onFocus={e=>e.target.style.borderColor=`${c}55`}
          onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}/>
      </div>

      {(orderType === "LIMIT" || orderType === "STOPLOSS/TARGET") && (
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:5 }}>Limit Price (₹)</label>
          <input type="number" value={limitPx} onChange={e=>setLimitPx(e.target.value)} placeholder={`e.g. ${fmt(livePrice, 0)}`}
            style={{ background:"rgba(6,13,26,0.7)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"10px 12px", color:"#eef0f8", fontFamily:"'DM Mono',monospace", fontSize:14, width:"100%", outline:"none" }}
            onFocus={e=>e.target.style.borderColor=`${c}55`}
            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}/>
        </div>
      )}

      {orderType === "STOPLOSS/TARGET" && (
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:5 }}>Trigger Price (₹)</label>
          <input type="number" value={triggerPx} onChange={e=>setTriggerPx(e.target.value)} placeholder="Trigger at…"
            style={{ background:"rgba(6,13,26,0.7)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"10px 12px", color:"#eef0f8", fontFamily:"'DM Mono',monospace", fontSize:14, width:"100%", outline:"none" }}
            onFocus={e=>e.target.style.borderColor=`${c}55`}
            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}/>
        </div>
      )}

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:5 }}>
          Track in Portfolio <span style={{ color:"#2a3550", letterSpacing:0 }}>(optional)</span>
        </label>
        <select value={portfolioId} onChange={e=>setPortfolioId(e.target.value)}
          style={{ background:"rgba(6,13,26,0.7)", border:`1px solid ${portfolioId ? blue+"44" : "rgba(255,255,255,0.08)"}`, borderRadius:8, padding:"10px 12px", color:portfolioId ? "#eef0f8" : "#3a4a6a", fontFamily:"'DM Mono',monospace", fontSize:12, width:"100%", outline:"none", cursor:"pointer" }}>
          <option value="">— Don't track (order only) —</option>
          {portfolios.map(p => (
            <option key={p.id} value={p.id}>{p.name} · {(p.holdings||[]).length} holdings</option>
          ))}
        </select>
        {portfolioId && (
          <div style={{ fontSize:9, color:"#3a4a6a", fontFamily:"'DM Mono',monospace", marginTop:4 }}>
            ✓ Trade will execute via Trade Service and also be recorded in this portfolio
          </div>
        )}
      </div>

      <WalletBalanceHint isBuy={isBuy} pfMode={false} qty={qty} price={parseFloat(limitPx || livePrice)}/>

      {qty && parseInt(qty) > 0 && (
        <div style={{ background:"rgba(6,13,26,0.5)", borderRadius:8, padding:"8px 12px", marginBottom:12, display:"flex", justifyContent:"space-between", border:"1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>EST. TOTAL</span>
          <span style={{ fontSize:13, color:"#eef0f8", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>
            ₹{fmt(parseFloat(limitPx || livePrice) * parseInt(qty || 0))}
          </span>
        </div>
      )}

      <button onClick={submit} disabled={loading}
        style={{ width:"100%", padding:"13px", background:`${c}18`, border:`1px solid ${c}55`, color:c, borderRadius:10, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:15, cursor:loading ? "wait" : "pointer", opacity:loading ? 0.7 : 1, transition:"all 0.15s", letterSpacing:0.5 }}
        onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background=`${c}28`; }}
        onMouseLeave={e=>e.currentTarget.style.background=`${c}18`}>
        {loading ? "PLACING…" : `${isBuy ? "▲ BUY" : "▼ SELL"} ${qty || 0} × ${company.name}`}
      </button>

      {status && (
        <div style={{ marginTop:10, padding:"10px 14px", background:status.ok ? "rgba(0,212,160,0.08)" : "rgba(255,90,106,0.08)", border:`1px solid ${status.ok ? teal : red}44`, borderRadius:8, fontSize:11, color:status.ok ? teal : red, fontFamily:"'DM Mono',monospace", lineHeight:1.5 }}>
          {status.ok ? "✓ " : "✕ "}{status.msg}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART INSIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function ChartInsights({ history=[], open, high, low, price, dayChangePct }) {
  if (history.length < 3) return null;
  const changes  = history.slice(1).map((v,i)=>((v-history[i])/history[i])*100);
  const avgChg   = changes.reduce((a,b)=>a+b,0)/changes.length;
  const stdDev   = Math.sqrt(changes.reduce((a,b)=>a+(b-avgChg)**2,0)/changes.length);
  const rN       = Math.min(5, Math.floor(history.length/3));
  const momentum = rN>0 ? ((history.slice(-rN).reduce((a,b)=>a+b,0)/rN - history.slice(0,rN).reduce((a,b)=>a+b,0)/rN) / (history.slice(0,rN).reduce((a,b)=>a+b,0)/rN))*100 : 0;
  const ups      = changes.filter(c=>c>0).length;
  const downs    = changes.filter(c=>c<0).length;
  const trendStr = Math.round((Math.max(ups,downs)/Math.max(changes.length,1))*100);
  const trendDir = ups>=downs?"BULLISH":"BEARISH";
  let signal="NEUTRAL", sigColor="#4a5a7a";
  if (momentum>0.5&&stdDev<2)    { signal="TRENDING UP";    sigColor=teal; }
  else if(momentum<-0.5&&stdDev<2){ signal="TRENDING DOWN";  sigColor=red; }
  else if(stdDev>3)               { signal="HIGH VOLATILITY";sigColor=amber; }
  else if(Math.abs(dayChangePct)>15){ signal="NEAR CIRCUIT"; sigColor=amber; }

  const stats = [
    { label:"Volatility σ", val:`${stdDev.toFixed(3)}%`,          color:stdDev>3?amber:stdDev>1.5?"#c8d4f0":teal },
    { label:"Momentum",     val:`${momentum>=0?"+":""}${momentum.toFixed(3)}%`, color:momentum>=0?teal:red },
    { label:"Trend",        val:`${trendStr}% ${trendDir}`,        color:trendDir==="BULLISH"?teal:red },
    { label:"Avg Tick Δ",   val:`${avgChg>=0?"+":""}${avgChg.toFixed(3)}%`,    color:avgChg>=0?teal:red },
    { label:"Circuit Left", val:`${(20-Math.abs(dayChangePct)).toFixed(2)}%`,  color:(20-Math.abs(dayChangePct))<5?red:(20-Math.abs(dayChangePct))<10?amber:teal },
    { label:"Ticks",        val:`${history.length}`,               color:"#c8d4f0" },
    { label:"Day High",     val:`₹${fmt(high)}`,                   color:teal },
    { label:"Day Low",      val:`₹${fmt(low)}`,                    color:red },
    { label:"vs Open",      val:`${price>=open?"+":""}${(((price-open)/open)*100).toFixed(3)}%`, color:price>=open?teal:red },
  ];

  return (
    <div style={{ padding:"16px 28px 0" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:3, height:14, background:blue, borderRadius:2 }}/>
        <span style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Chart Analytics</span>
        <div style={{ marginLeft:"auto", background:`${sigColor}18`, border:`1px solid ${sigColor}44`, color:sigColor, fontSize:9, padding:"3px 10px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>{signal}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:2 }}>
        {stats.map((s,i) => (
          <div key={s.label} style={{ padding:"9px 11px", background:i%2===0?"#060d1a":"rgba(255,255,255,0.01)", borderRadius:6 }}>
            <div style={{ fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:11, fontWeight:600, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:8, padding:"9px 12px", background:"#060d1a", borderRadius:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Bull / Bear Balance</span>
          <span style={{ fontSize:9, color:"#4a5a7a", fontFamily:"'DM Mono',monospace" }}>{ups}↑ · {downs}↓</span>
        </div>
        <div style={{ height:4, background:"rgba(255,90,106,0.2)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(ups/(ups+downs||1))*100}%`, background:`linear-gradient(90deg,${teal},${teal}aa)`, borderRadius:2, transition:"width 0.5s" }}/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL SPARKLINE
// ─────────────────────────────────────────────────────────────────────────────
function LiveSparkline({ history=[], width=80, height=32 }) {
  if (history.length < 2) return <div style={{ width, height }}/>;
  const max=Math.max(...history), min=Math.min(...history);
  const up=history[history.length-1]>=history[0], c=up?teal:red;
  const range = max - min || 1;
  const pts=history.map((v,i)=>`${(i/(history.length-1))*width},${height-((v-min)/range)*(height-6)-3}`).join(" ");
  const lastPt = pts.split(" ").pop().split(",");
  const area=`${pts} ${width},${height} 0,${height}`;
  const uid=`sp${width}x${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:"block", flexShrink:0 }}>
      <defs><linearGradient id={uid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity="0.25"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient></defs>
      <polygon points={area} fill={`url(#${uid})`}/>
      <polyline points={pts} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill={c}/>
    </svg>
  );
}

function useFlash(value) {
  const [flash, setFlash] = useState(null);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      setFlash(value > prev.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return flash;
}

function CircuitBadge({ dayPct }) {
  const abs = Math.abs(dayPct);
  if (abs >= 19.5) return <span style={{ background:"rgba(255,90,106,0.2)", border:"1px solid #ff5a6a66", color:red, fontSize:9, padding:"2px 7px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:1, animation:"flashBadge 0.8s infinite" }}>⚠ CIRCUIT</span>;
  if (abs >= 15)   return <span style={{ background:"rgba(251,191,36,0.15)", border:"1px solid #fbbf2466", color:amber, fontSize:9, padding:"2px 7px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>⚡ LIMIT</span>;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE COMPANY ROW
// ─────────────────────────────────────────────────────────────────────────────
function LiveCompanyRow({ company, liveData, onClick, watchlist, alerts, onToggleWatch, onSetAlert }) {
  const { price, open, high, low, dayChangePct, tickChangePct, history } = liveData;
  const flash     = useFlash(price);
  const up        = dayChangePct >= 0;
  const color     = up ? teal : red;
  const flashBg   = flash==="up"?"rgba(0,212,160,0.08)":flash==="down"?"rgba(255,90,106,0.08)":"transparent";
  const isWatched = watchlist && watchlist.has(company.id);
  const hasAlert  = alerts && alerts.some(a => a.companyId === company.id);

  return (
    <tr style={{ background:flashBg, cursor:"pointer", transition:"background 0.3s", borderBottom:"1px solid rgba(255,255,255,0.03)" }}
      onMouseEnter={e => { if (!flash) e.currentTarget.style.background="rgba(0,184,255,0.03)"; }}
      onMouseLeave={e => { if (!flash) e.currentTarget.style.background="transparent"; }}>

      <td style={{ padding:"12px 16px" }} onClick={() => onClick(company, liveData)}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${color}22,${color}08)`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700, color, flexShrink:0 }}>
            {(company.symbol || company.name.substring(0,3)).toUpperCase().substring(0,3)}
          </div>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600, color:"#c8d4f0", letterSpacing:1 }}>{company.symbol || company.name.substring(0,6)}</div>
            <div style={{ fontSize:10, color:"#5a6a8a", marginTop:1 }}>{company.name}</div>
          </div>
        </div>
      </td>

      <td style={{ padding:"12px 16px", textAlign:"right" }} onClick={() => onClick(company, liveData)}>
        <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, fontWeight:800, color:flash?(flash==="up"?teal:red):"#eef0f8", transition:"color 0.4s" }}>
          {price > 0 ? `₹${fmt(price)}` : <span style={{ color:"#2a3550", fontSize:12 }}>—</span>}
        </div>
        {price > 0 && <div style={{ fontSize:9, color:tickChangePct>=0?teal:red, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{tickChangePct>=0?"▲":"▼"} {Math.abs(tickChangePct).toFixed(2)}%</div>}
      </td>

      <td style={{ padding:"12px 16px", textAlign:"right" }} onClick={() => onClick(company, liveData)}>
        {price > 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
            <span style={{ color, fontSize:12, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{dayChangePct>=0?"+":""}{dayChangePct.toFixed(2)}%</span>
            <CircuitBadge dayPct={dayChangePct}/>
          </div>
        ) : <span style={{ color:"#2a3550", fontSize:11 }}>Not listed</span>}
      </td>

      <td style={{ padding:"12px 16px", textAlign:"right" }} onClick={() => onClick(company, liveData)}>
        <div style={{ fontSize:12, color:"#6a7a9a", fontFamily:"'DM Mono',monospace" }}>{open>0?`₹${fmt(open)}`:"—"}</div>
      </td>
      <td style={{ padding:"12px 16px", textAlign:"right" }} onClick={() => onClick(company, liveData)}>
        <div style={{ fontSize:12, color:teal, fontFamily:"'DM Mono',monospace" }}>{high>0?`₹${fmt(high)}`:"—"}</div>
      </td>
      <td style={{ padding:"12px 16px", textAlign:"right" }} onClick={() => onClick(company, liveData)}>
        <div style={{ fontSize:12, color:red, fontFamily:"'DM Mono',monospace" }}>{low>0?`₹${fmt(low)}`:"—"}</div>
      </td>
      <td style={{ padding:"12px 16px" }} onClick={() => onClick(company, liveData)}>
        {history.length >= 2 ? <LiveSparkline history={history} width={64} height={26}/> : <span style={{ color:"#2a3550", fontSize:10 }}>—</span>}
      </td>

      <td style={{ padding:"12px 10px" }}>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          <button
            title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
            onClick={e => { e.stopPropagation(); onToggleWatch && onToggleWatch(company.id); }}
            style={{
              width:28, height:28, borderRadius:7, cursor:"pointer",
              border:`1px solid ${isWatched ? "rgba(251,191,36,0.55)" : "rgba(255,255,255,0.1)"}`,
              background: isWatched ? "rgba(251,191,36,0.14)" : "rgba(255,255,255,0.03)",
              color: isWatched ? amber : "#3a4a6a",
              fontSize:14, display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.15s",
            }}
            onMouseEnter={e => { if (!isWatched) { e.currentTarget.style.borderColor="rgba(251,191,36,0.4)"; e.currentTarget.style.color=amber; }}}
            onMouseLeave={e => { if (!isWatched) { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#3a4a6a"; }}}>
            {isWatched ? "★" : "☆"}
          </button>

          <button
            title={hasAlert ? "Edit price alert" : "Set price alert"}
            onClick={e => { e.stopPropagation(); onSetAlert && onSetAlert(company); }}
            style={{
              width:28, height:28, borderRadius:7, cursor:"pointer",
              border:`1px solid ${hasAlert ? "rgba(0,184,255,0.55)" : "rgba(255,255,255,0.1)"}`,
              background: hasAlert ? "rgba(0,184,255,0.14)" : "rgba(255,255,255,0.03)",
              color: hasAlert ? blue : "#3a4a6a",
              fontSize:13, display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.15s",
            }}
            onMouseEnter={e => { if (!hasAlert) { e.currentTarget.style.borderColor="rgba(0,184,255,0.4)"; e.currentTarget.style.color=blue; }}}
            onMouseLeave={e => { if (!hasAlert) { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#3a4a6a"; }}}>
            🔔
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE DETAIL MODAL — wrapped in ErrorBoundary, safe ResizeObserver
// ─────────────────────────────────────────────────────────────────────────────
function LiveDetailModalInner({ company, liveData, onClose }) {
  const { price, open, high, low, dayChangePct, tickChangePct, history } = liveData;
  const up       = dayChangePct >= 0;
  const color    = up ? teal : red;
  const flash    = useFlash(price);
  const rangePos = high > low ? Math.min(Math.max(((price-low)/((high-low)))*100, 2), 98) : 50;

  const [candles,    setCandles]    = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [priceHist,  setPriceHist]  = useState([]);
  const [activeView, setActiveView] = useState("live");

  // Use a single container ref — measure it once, don't track width in state
  // (avoids the ResizeObserver → zero-width → NaN crash)
  const chartContainerRef = useRef(null);

  const tradeIdRef = useRef(liveData.companyId);
  useEffect(() => {
    const tradeId = tradeIdRef.current;
    if (!tradeId) return;
    TRADE_API.get(`/candles/${tradeId}`).then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setCandles(data);
    }).catch(() => setCandles([]));
    TRADE_API.get(`/indicators/${tradeId}`).then(r => setIndicators(r.data)).catch(() => {});
    TRADE_API.get(`/price-history/${tradeId}`).then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setPriceHist(data);
    }).catch(() => setPriceHist([]));
  }, []);

  const hasLiveData = price > 0;
  const views = [
    { id:"live",    label:"Live Chart" },
    { id:"candle",  label:"Candles" },
    { id:"history", label:"History" },
    { id:"trade",   label:"Trade" },
  ];

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{ position:"fixed", inset:0, background:"rgba(4,8,18,0.93)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9000, backdropFilter:"blur(12px)", padding:"12px" }}>
      <div style={{ background:"#080f1e", border:`1px solid ${color}33`, borderTop:`2px solid ${color}`, borderRadius:20, width:"100%", maxWidth:920, maxHeight:"96vh", overflowY:"auto", position:"relative" }}>

        <button onClick={onClose}
          style={{ position:"absolute", top:16, right:18, background:"rgba(255,255,255,0.04)", border:"1px solid #192030", color:"#4a5a7a", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 }}
          onMouseEnter={e=>{ e.currentTarget.style.color="#eef0f8"; e.currentTarget.style.borderColor="#3a4a6a"; }}
          onMouseLeave={e=>{ e.currentTarget.style.color="#4a5a7a"; e.currentTarget.style.borderColor="#192030"; }}>✕</button>

        {/* Header */}
        <div style={{ padding:"22px 28px 16px", borderBottom:"1px solid #0e1828" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                <div style={{ background:`${color}18`, border:`1px solid ${color}44`, color, padding:"5px 14px", borderRadius:6, fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, letterSpacing:2 }}>
                  {company.symbol || company.name.substring(0,4).toUpperCase()}
                </div>
                {hasLiveData ? (
                  <span style={{ background:"rgba(0,212,160,0.1)", border:"1px solid rgba(0,212,160,0.3)", color:teal, fontSize:9, padding:"4px 10px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:2, display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:teal, display:"inline-block", animation:"pulseDot 1.5s infinite" }}/>
                    WS LIVE · 1S
                  </span>
                ) : (
                  <span style={{ background:"rgba(255,90,106,0.1)", border:"1px solid rgba(255,90,106,0.3)", color:red, fontSize:9, padding:"4px 10px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>
                    NOT IN TRADE-SERVICE
                  </span>
                )}
                <CircuitBadge dayPct={dayChangePct}/>
              </div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:600, color:"#6a7a9a" }}>
                {company.name} · {company.sector} · ID #{company.id}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              {hasLiveData ? (
                <>
                  <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:36, fontWeight:800, letterSpacing:-1, lineHeight:1, color:flash?(flash==="up"?teal:red):"#eef0f8", transition:"color 0.4s" }}>
                    ₹{fmt(price)}
                  </div>
                  <div style={{ marginTop:5, display:"flex", justifyContent:"flex-end", gap:8 }}>
                    <span style={{ background:`${color}18`, border:`1px solid ${color}33`, color, padding:"4px 12px", borderRadius:20, fontSize:12, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>
                      {up?"+":""}{dayChangePct.toFixed(2)}% day
                    </span>
                    <span style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #192030", color:"#3a4a6a", padding:"4px 10px", borderRadius:20, fontSize:11, fontFamily:"'DM Mono',monospace" }}>
                      {tickChangePct>=0?"+":""}{tickChangePct.toFixed(2)}% tick
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ color:"#2a3550", fontFamily:"'DM Mono',monospace", fontSize:12, marginTop:8 }}>
                  Add this company to trade-service<br/>to enable live pricing
                </div>
              )}
            </div>
          </div>

          {hasLiveData && high > 0 && low > 0 && (
            <div style={{ marginTop:14 }}>
              <div style={{ position:"relative", height:5, background:"rgba(255,255,255,0.05)", borderRadius:3 }}>
                <div style={{ position:"absolute", left:0, width:`${rangePos}%`, height:"100%", background:`linear-gradient(90deg,${red},${color})`, borderRadius:3, transition:"width 0.5s" }}/>
                <div style={{ position:"absolute", left:`${rangePos}%`, top:"50%", transform:"translate(-50%,-50%)", width:11, height:11, borderRadius:"50%", background:color, boxShadow:`0 0 7px ${color}`, border:"2px solid #080f1e" }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                <span style={{ fontSize:10, color:red,  fontFamily:"'DM Mono',monospace" }}>L ₹{fmt(low)}</span>
                <span style={{ fontSize:9,  color:"#5a6a8a", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>DAY RANGE</span>
                <span style={{ fontSize:10, color:teal, fontFamily:"'DM Mono',monospace" }}>H ₹{fmt(high)}</span>
              </div>
            </div>
          )}
        </div>

        {indicators && (
          <div style={{ display:"flex", gap:14, padding:"10px 28px", background:"#060d1a", borderBottom:"1px solid #0e1828", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>MA(5)</span>
              <span style={{ fontSize:13, fontWeight:700, color:price>=indicators.MovingAverage?teal:red, fontFamily:"'DM Mono',monospace" }}>₹{fmt(indicators.MovingAverage)}</span>
              <span style={{ fontSize:9, color:price>=indicators.MovingAverage?teal:red, fontFamily:"'DM Mono',monospace" }}>{price>=indicators.MovingAverage?"▲ ABOVE":"▼ BELOW"}</span>
            </div>
            <div style={{ width:1, height:16, background:"#0e1828" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>RSI(14)</span>
              <span style={{ fontSize:13, fontWeight:700, color:indicators.RSI>=70?red:indicators.RSI<=30?teal:"#c8d4f0", fontFamily:"'DM Mono',monospace" }}>{indicators.RSI.toFixed(1)}</span>
              <span style={{ fontSize:9, color:indicators.RSI>=70?red:indicators.RSI<=30?teal:"#4a5a7a", fontFamily:"'DM Mono',monospace" }}>{indicators.RSI>=70?"OVERBOUGHT":indicators.RSI<=30?"OVERSOLD":"NEUTRAL"}</span>
            </div>
          </div>
        )}

        <div style={{ display:"flex", borderBottom:"1px solid #0e1828" }}>
          {views.map(v => (
            <button key={v.id} onClick={()=>setActiveView(v.id)}
              style={{ flex:1, padding:"11px", border:"none", borderBottom:`2px solid ${activeView===v.id?color:"transparent"}`, background:"transparent", color:activeView===v.id?color:"#5a6a8a", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", transition:"all 0.15s" }}>
              {v.label}
            </button>
          ))}
        </div>

        {activeView === "live" && (
          <>
            {!hasLiveData ? (
              <div style={{ padding:"48px 28px", textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:12, color:"#2a3550" }}>◎</div>
                <div style={{ color:"#4a5a7a", fontSize:12, fontFamily:"'DM Mono',monospace", letterSpacing:2, marginBottom:8 }}>NO LIVE DATA</div>
                <div style={{ color:"#2a3550", fontSize:11 }}>This company is not registered in the trade-service (port 8083).</div>
              </div>
            ) : (
              <>
                {/* Chart container — no ResizeObserver, SVG scales via width="100%" */}
                <div ref={chartContainerRef} style={{ padding:"12px 8px 0", background:"#060d1a", borderBottom:"1px solid #0e1828" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 20px 8px" }}>
                    <span style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Price Chart · Hover to inspect</span>
                  </div>
                  <InteractiveChart history={history} open={open} high={high} low={low} height={180}/>
                </div>
                <div style={{ margin:"12px 28px 0", background:"#060d1a", borderRadius:10, padding:"11px 16px", border:"1px solid #0e1828" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Daily Circuit Usage</span>
                    <span style={{ fontSize:10, color:Math.abs(dayChangePct)>=15?amber:"#4a5a7a", fontFamily:"'DM Mono',monospace" }}>{Math.abs(dayChangePct).toFixed(2)}% / 20.00%</span>
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.05)", borderRadius:3 }}>
                    <div style={{ width:`${Math.min(Math.abs(dayChangePct)/20*100,100)}%`, height:"100%", background:`linear-gradient(90deg,${teal},${Math.abs(dayChangePct)>=15?amber:teal},${Math.abs(dayChangePct)>=19.5?red:teal})`, borderRadius:3, transition:"width 0.5s" }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                    {[5,10,15,20].map(p=><span key={p} style={{ fontSize:8, color:"#4a5a7a", fontFamily:"'DM Mono',monospace" }}>{p}%</span>)}
                  </div>
                </div>
                <ChartInsights history={history} open={open} high={high} low={low} price={price} dayChangePct={dayChangePct}/>
                <div style={{ padding:"14px 28px 0" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:2 }}>
                    {[
                      { label:"Open",        val:`₹${fmt(open)}` },
                      { label:"Live Price",  val:`₹${fmt(price)}`,  hi:tickChangePct>0, lo:tickChangePct<0 },
                      { label:"Day High",    val:`₹${fmt(high)}`,   hi:true },
                      { label:"Day Low",     val:`₹${fmt(low)}`,    lo:true },
                      { label:"Day Change",  val:`${up?"+":""}${dayChangePct.toFixed(2)}%`, hi:up, lo:!up },
                      { label:"Tick Change", val:`${tickChangePct>=0?"+":""}${tickChangePct.toFixed(2)}%`, hi:tickChangePct>0, lo:tickChangePct<0 },
                      { label:"Tick Limit",  val:"±5% / tick" },
                      { label:"Circuit",     val:"±20% / day" },
                      { label:"Data Points", val:history.length },
                      { label:"Interval",    val:"1 second" },
                    ].map((s,i)=>(
                      <div key={s.label} style={{ padding:"9px 11px", background:i%2===0?"#060d1a":"transparent", borderRadius:6 }}>
                        <div style={{ fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:3 }}>{s.label}</div>
                        <div style={{ fontSize:11, fontWeight:600, fontFamily:"'DM Mono',monospace", color:s.hi?teal:s.lo?red:"#c8d4f0" }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ height:20 }}/>
              </>
            )}
          </>
        )}

        {/* Candle tab — wrapped in ErrorBoundary so a chart crash doesn't blank the screen */}
        {activeView === "candle" && (
          <div style={{ padding:"16px 28px" }}>
            <ErrorBoundary>
              <div style={{ background:"#060d1a", borderRadius:12, padding:"12px 8px 8px", border:"1px solid #0e1828", marginBottom:16 }}>
                <CandleChart candles={candles} height={200}/>
              </div>
            </ErrorBoundary>
            {indicators && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:12, padding:"18px 20px", display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <span style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:10 }}>RSI (14)</span>
                  <RsiGauge rsi={indicators.RSI}/>
                </div>
                <div style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:12, padding:"18px 20px" }}>
                  <span style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:12 }}>Moving Average (5)</span>
                  <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:28, fontWeight:800, color:price>=indicators.MovingAverage?teal:red, marginBottom:6 }}>₹{fmt(indicators.MovingAverage)}</div>
                  <div style={{ fontSize:11, color:price>=indicators.MovingAverage?teal:red, fontFamily:"'DM Mono',monospace", marginBottom:12 }}>
                    {price>=indicators.MovingAverage?"▲ Price above MA — bullish signal":"▼ Price below MA — bearish signal"}
                  </div>
                  <div style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace" }}>
                    {((price-indicators.MovingAverage)/indicators.MovingAverage*100>=0?"+":"")}
                    {((price-indicators.MovingAverage)/indicators.MovingAverage*100).toFixed(3)}% from MA
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === "history" && (
          <div style={{ padding:"16px 28px" }}>
            <div style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:12, overflow:"hidden" }}>
              <PriceHistoryTable rows={priceHist}/>
            </div>
          </div>
        )}

        {activeView === "trade" && (
          <div style={{ padding:"16px 28px" }}>
            {!hasLiveData ? (
              <div style={{ padding:"32px", textAlign:"center", color:"#4a5a7a", fontSize:12, fontFamily:"'DM Mono',monospace" }}>
                Company not in trade-service — cannot place orders
              </div>
            ) : (
              <div style={{ maxWidth:440 }}>
                <OrderPanel
                  company={company}
                  livePrice={price}
                  tradeCompanyId={liveData.companyId}
                />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function LiveDetailModal(props) {
  return (
    <ErrorBoundary>
      <LiveDetailModalInner {...props}/>
    </ErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AlertModal({ company, livePrice, existingAlerts, onSave, onRemove, onClose }) {
  const [direction, setDirection] = useState("above");
  const [target,    setTarget]    = useState(livePrice ? String(Math.round(livePrice)) : "");
  const [error,     setError]     = useState("");
  const existing = existingAlerts.filter(a => a.companyId === company.id);
  const submit = () => {
    const t = parseFloat(target);
    if (!t || t <= 0) { setError("Enter a valid price"); return; }
    if (Notification.permission === "default") Notification.requestPermission();
    onSave({ companyId:company.id, symbol:company.symbol||company.name.substring(0,6).toUpperCase(), targetPrice:t, direction });
    onClose();
  };
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(4,8,18,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9200,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",padding:16}}>
      <div className="glass-card" style={{borderRadius:20,width:"100%",maxWidth:420,padding:"28px 30px",position:"relative",borderTop:`2px solid ${blue}`}}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:16,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#4a5a7a",width:30,height:30,borderRadius:8,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        <div style={{fontSize:9,color:"#5a6a8a",letterSpacing:3,textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:4}}>Price Alert</div>
        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:20,fontWeight:800,color:"#eef0f8",marginBottom:4}}>{company.symbol||company.name}</div>
        <div style={{fontSize:12,color:blue,fontFamily:"'DM Mono',monospace",marginBottom:18}}>Now ₹{fmt(livePrice)}</div>
        {existing.length > 0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:9,color:"#5a6a8a",letterSpacing:2,textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:8}}>Active Alerts</div>
            {existing.map(a => (
              <div key={a.direction+a.targetPrice} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,184,255,0.06)",border:"1px solid rgba(0,184,255,0.2)",borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                <span style={{fontSize:11,color:blue,fontFamily:"'DM Mono',monospace"}}>{a.direction==="above"?"▲ above":"▼ below"} ₹{fmt(a.targetPrice)}</span>
                <button onClick={()=>onRemove(a.companyId,a.direction)} style={{background:"rgba(255,90,106,0.1)",border:"1px solid rgba(255,90,106,0.3)",color:red,padding:"3px 9px",borderRadius:5,cursor:"pointer",fontSize:9,fontFamily:"'DM Mono',monospace"}}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <div style={{fontSize:9,color:"#5a6a8a",letterSpacing:2,textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:10}}>New Alert</div>
        <div style={{display:"flex",gap:0,marginBottom:12,borderRadius:8,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
          {[["above","▲ Crosses Above",teal],["below","▼ Drops Below",red]].map(([d,lbl,c])=>(
            <button key={d} onClick={()=>setDirection(d)} style={{flex:1,padding:"9px",border:"none",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:1,cursor:"pointer",background:direction===d?`${c}18`:"transparent",color:direction===d?c:"#2a3550",transition:"all 0.15s"}}>{lbl}</button>
          ))}
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:9,color:"#5a6a8a",letterSpacing:2,textTransform:"uppercase",fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>Target Price (₹)</label>
          <input type="number" value={target} onChange={e=>{setTarget(e.target.value);setError("");}}
            placeholder={`e.g. ${Math.round(livePrice*1.05)}`}
            style={{background:"rgba(6,13,26,0.8)",border:`1px solid ${error?"rgba(255,90,106,0.5)":"rgba(255,255,255,0.09)"}`,borderRadius:8,padding:"10px 14px",color:"#eef0f8",fontFamily:"'DM Mono',monospace",fontSize:14,width:"100%",outline:"none"}}
            onFocus={e=>e.target.style.borderColor=`${blue}55`}
            onBlur={e=>e.target.style.borderColor=error?"rgba(255,90,106,0.5)":"rgba(255,255,255,0.09)"}
            onKeyDown={e=>{ if(e.key==="Enter") submit(); }}/>
          {error && <div style={{fontSize:10,color:red,fontFamily:"'DM Mono',monospace",marginTop:5}}>{error}</div>}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#3a4a6a",borderRadius:9,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:2}}>CANCEL</button>
          <button onClick={submit} style={{flex:2,padding:"10px",background:`${blue}18`,border:`1px solid ${blue}55`,color:blue,borderRadius:9,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:14,transition:"all 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background=`${blue}28`}
            onMouseLeave={e=>e.currentTarget.style.background=`${blue}18`}>
            Set Alert 🔔
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WATCHLIST CARD
// ─────────────────────────────────────────────────────────────────────────────
function WatchlistCard({ company, liveData, alerts, onRemove, onSetAlert, onOpenDetail }) {
  const { price, dayChangePct, tickChangePct, history, high, low } = liveData;
  const flash    = useFlash(price);
  const up       = dayChangePct >= 0;
  const color    = up ? teal : red;
  const hasAlert = (alerts||[]).some(a => a.companyId === company.id);
  const compAlerts = (alerts||[]).filter(a => a.companyId === company.id);
  return (
    <div className="glass-card"
      style={{borderRadius:16,padding:"18px 20px",cursor:"pointer",transition:"all 0.2s",position:"relative",overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}
      onClick={()=>onOpenDetail(company,liveData)}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.16)";e.currentTarget.style.transform="translateY(-2px)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.transform="translateY(0)";}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color}00,${color}bb,${color}00)`}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${color}28,${color}08)`,border:`1px solid ${color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color,fontFamily:"'DM Mono',monospace"}}>
            {(company.symbol||company.name).substring(0,3).toUpperCase()}
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#eef0f8",fontFamily:"'DM Mono',monospace",letterSpacing:1}}>{company.symbol||company.name.substring(0,8)}</div>
            <div style={{fontSize:10,color:"#3a4a6a",marginTop:1}}>{company.name}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:5}}>
          <button title="Price alert" onClick={e=>{e.stopPropagation();onSetAlert(company);}}
            style={{width:26,height:26,borderRadius:6,border:`1px solid ${hasAlert?"rgba(0,184,255,0.45)":"rgba(255,255,255,0.08)"}`,background:hasAlert?"rgba(0,184,255,0.12)":"rgba(255,255,255,0.04)",color:hasAlert?blue:"#3a4a6a",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.color=blue;}}
            onMouseLeave={e=>{if(!hasAlert)e.currentTarget.style.color="#3a4a6a";}}>🔔</button>
          <button title="Remove" onClick={e=>{e.stopPropagation();onRemove(company.id);}}
            style={{width:26,height:26,borderRadius:6,border:"1px solid rgba(255,90,106,0.15)",background:"rgba(255,90,106,0.04)",color:"#3a4a6a",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.color=red;e.currentTarget.style.borderColor="rgba(255,90,106,0.5)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="#3a4a6a";e.currentTarget.style.borderColor="rgba(255,90,106,0.15)";}}>✕</button>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
        <div>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:24,fontWeight:800,color:flash?(flash==="up"?teal:red):"#eef0f8",transition:"color 0.4s",letterSpacing:-0.5}}>
            {price>0?`₹${fmt(price)}`:"—"}
          </div>
          <div style={{display:"flex",gap:8,marginTop:3}}>
            <span style={{fontSize:11,color,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{up?"+":""}{dayChangePct.toFixed(2)}%</span>
            <span style={{fontSize:10,color:"#3a4a6a",fontFamily:"'DM Mono',monospace"}}>{tickChangePct>=0?"▲":"▼"}{Math.abs(tickChangePct).toFixed(2)}% tick</span>
          </div>
        </div>
        <LiveSparkline history={history} width={80} height={36}/>
      </div>
      {high>0&&low>0&&(()=>{
        const pos=Math.min(Math.max(((price-low)/((high-low)||1))*100,2),98);
        return (
          <div style={{marginBottom:compAlerts.length?10:0}}>
            <div style={{position:"relative",height:3,background:"rgba(255,255,255,0.05)",borderRadius:2}}>
              <div style={{position:"absolute",left:0,width:`${pos}%`,height:"100%",background:`linear-gradient(90deg,${red},${color})`,borderRadius:2}}/>
              <div style={{position:"absolute",left:`${pos}%`,top:"50%",transform:"translate(-50%,-50%)",width:7,height:7,borderRadius:"50%",background:color,border:"1px solid rgba(8,15,30,0.8)"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
              <span style={{fontSize:8,color:red,fontFamily:"'DM Mono',monospace"}}>L ₹{fmt(low)}</span>
              <span style={{fontSize:8,color:teal,fontFamily:"'DM Mono',monospace"}}>H ₹{fmt(high)}</span>
            </div>
          </div>
        );
      })()}
      {compAlerts.length>0&&(
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {compAlerts.map(a=>(
            <span key={a.direction+a.targetPrice} style={{background:"rgba(0,184,255,0.08)",border:"1px solid rgba(0,184,255,0.22)",color:blue,fontSize:9,padding:"2px 8px",borderRadius:4,fontFamily:"'DM Mono',monospace"}}>
              🔔 {a.direction==="above"?"▲":"▼"} ₹{fmt(a.targetPrice)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ProfileModal({ onClose, onDeposit }) {
  const [tab,         setTab]         = useState("wallet");
  const [balance,     setBalance]     = useState(null);
  const [depositAmt,  setDepositAmt]  = useState("");
  const [walletBusy,  setWalletBusy]  = useState(false);
  const [walletMsg,   setWalletMsg]   = useState(null);
  const [curPwd,      setCurPwd]      = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confPwd,     setConfPwd]     = useState("");
  const [pwdBusy,     setPwdBusy]     = useState(false);
  const [pwdMsg,      setPwdMsg]      = useState(null);

  const username = localStorage.getItem("username") || "User";
  const email    = localStorage.getItem("userEmail") || "";
  const userId   = localStorage.getItem("userId");

  useEffect(() => {
    PORTFOLIO_API.get("/wallet/balance")
      .then(r => setBalance(r.data.balance))
      .catch(() => setBalance(null));
  }, []);

  const deposit = async () => {
    const amt = parseFloat(depositAmt);
    if (!amt || amt <= 0) { setWalletMsg({ ok:false, text:"Enter a valid amount" }); return; }
    setWalletBusy(true); setWalletMsg(null);
    try {
      const r = await PORTFOLIO_API.post("/wallet/deposit", { amount: amt });
      setBalance(r.data.balance);
      setDepositAmt("");
      setWalletMsg({ ok:true, text:`₹${fmt(amt)} added! New balance: ₹${fmt(r.data.balance)}` });
      if (onDeposit) onDeposit();
    } catch(e) {
      setWalletMsg({ ok:false, text: e.response?.data?.message || "Deposit failed" });
    } finally { setWalletBusy(false); }
  };

  const changePassword = async () => {
    if (!curPwd || !newPwd || !confPwd) { setPwdMsg({ ok:false, text:"Fill all fields" }); return; }
    if (newPwd !== confPwd)              { setPwdMsg({ ok:false, text:"New passwords do not match" }); return; }
    if (newPwd.length < 6)              { setPwdMsg({ ok:false, text:"Password must be at least 6 characters" }); return; }
    setPwdBusy(true); setPwdMsg(null);
    try {
      await AUTH_API.post("/auth/change-password", {
        userId:          parseInt(userId),
        currentPassword: curPwd,
        newPassword:     newPwd,
      });
      setPwdMsg({ ok:true, text:"Password changed successfully!" });
      setCurPwd(""); setNewPwd(""); setConfPwd("");
    } catch(e) {
      setPwdMsg({ ok:false, text: e.response?.data?.message || "Failed to change password" });
    } finally { setPwdBusy(false); }
  };

  const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000];

  return (
    <div onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(4,8,18,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9300, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", padding:16 }}>
      <div className="glass-card" style={{ borderRadius:22, width:"100%", maxWidth:480, position:"relative", overflow:"hidden", borderTop:`2px solid ${blue}` }}>

        <button onClick={onClose}
          style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#4a5a7a", width:30, height:30, borderRadius:8, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 }}
          onMouseEnter={e=>e.currentTarget.style.color="#eef0f8"}
          onMouseLeave={e=>e.currentTarget.style.color="#4a5a7a"}>✕</button>

        <div style={{ padding:"24px 28px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${blue}33,${purple}33)`, border:`1px solid ${blue}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:20, color:blue }}>
              {username.substring(0,1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:18, color:"#eef0f8" }}>{username}</div>
              <div style={{ fontSize:11, color:"#3a4a6a", fontFamily:"'DM Mono',monospace", marginTop:2 }}>{email}</div>
            </div>
            {balance !== null && (
              <div style={{ marginLeft:"auto", background:"rgba(0,212,160,0.1)", border:"1px solid rgba(0,212,160,0.3)", borderRadius:10, padding:"6px 14px", textAlign:"right" }}>
                <div style={{ fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Wallet</div>
                <div style={{ fontSize:16, fontWeight:800, color:teal, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>₹{fmt(balance)}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display:"flex", background:"rgba(6,13,26,0.6)" }}>
          {[["wallet","💰 Wallet"],["password","🔒 Password"]].map(([id, label]) => (
            <button key={id} onClick={()=>{ setTab(id); setWalletMsg(null); setPwdMsg(null); }}
              style={{ flex:1, padding:"12px", border:"none", borderBottom:`2px solid ${tab===id?blue:"transparent"}`, background:"transparent", color:tab===id?blue:"#3a4a6a", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:2, cursor:"pointer", transition:"all 0.15s", textTransform:"uppercase" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding:"24px 28px" }}>
          {tab === "wallet" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ background:"rgba(0,212,160,0.06)", border:"1px solid rgba(0,212,160,0.18)", borderRadius:14, padding:"20px 22px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:8 }}>Available Balance</div>
                {balance === null ? (
                  <div style={{ fontSize:12, color:"#3a4a6a", fontFamily:"'DM Mono',monospace" }}>
                    Create a portfolio first to activate your wallet
                  </div>
                ) : (
                  <>
                    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:38, fontWeight:800, color:teal, letterSpacing:-1 }}>₹{fmt(balance)}</div>
                    <div style={{ fontSize:10, color:"#3a4a6a", fontFamily:"'DM Mono',monospace", marginTop:4 }}>Virtual trading balance</div>
                  </>
                )}
              </div>
              <div>
                <div style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:8 }}>Quick Add</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {QUICK_AMOUNTS.map(a => (
                    <button key={a} onClick={()=>setDepositAmt(String(a))}
                      style={{ flex:1, minWidth:72, padding:"8px 4px", background: depositAmt===String(a)?"rgba(0,184,255,0.14)":"rgba(255,255,255,0.03)", border:`1px solid ${depositAmt===String(a)?"rgba(0,184,255,0.45)":"rgba(255,255,255,0.08)"}`, color:depositAmt===String(a)?blue:"#6a7a9a", borderRadius:8, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:0.5, transition:"all 0.15s" }}>
                      ₹{a >= 1000 ? (a/1000)+"K" : a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:6 }}>Custom Amount (₹)</label>
                <div style={{ display:"flex", gap:8 }}>
                  <input type="number" value={depositAmt} onChange={e=>setDepositAmt(e.target.value)}
                    placeholder="Enter amount…" min="1"
                    style={{ flex:1, background:"rgba(6,13,26,0.8)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:9, padding:"11px 14px", color:"#eef0f8", fontFamily:"'DM Mono',monospace", fontSize:14, outline:"none" }}
                    onFocus={e=>e.target.style.borderColor=`${teal}55`}
                    onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.09)"}
                    onKeyDown={e=>{ if(e.key==="Enter") deposit(); }}/>
                  <button onClick={deposit} disabled={walletBusy||!depositAmt}
                    style={{ padding:"11px 20px", background:`${teal}18`, border:`1px solid ${teal}55`, color:teal, borderRadius:9, cursor:walletBusy||!depositAmt?"not-allowed":"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:14, opacity:walletBusy||!depositAmt?0.5:1, whiteSpace:"nowrap", transition:"all 0.15s" }}
                    onMouseEnter={e=>{ if(!walletBusy&&depositAmt) e.currentTarget.style.background=`${teal}28`; }}
                    onMouseLeave={e=>e.currentTarget.style.background=`${teal}18`}>
                    {walletBusy ? "Adding…" : "+ Add"}
                  </button>
                </div>
              </div>
              {walletMsg && (
                <div style={{ padding:"10px 14px", background:walletMsg.ok?"rgba(0,212,160,0.08)":"rgba(255,90,106,0.08)", border:`1px solid ${walletMsg.ok?teal:red}44`, borderRadius:8, fontSize:11, color:walletMsg.ok?teal:red, fontFamily:"'DM Mono',monospace" }}>
                  {walletMsg.ok ? "✓ " : "✕ "}{walletMsg.text}
                </div>
              )}
              <div style={{ fontSize:10, color:"#2a3550", fontFamily:"'DM Mono',monospace", textAlign:"center", marginTop:4 }}>
                Virtual funds only · not real money
              </div>
            </div>
          )}

          {tab === "password" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { label:"Current Password",   val:curPwd,  set:setCurPwd,  ph:"Enter current password" },
                { label:"New Password",        val:newPwd,  set:setNewPwd,  ph:"Min 6 characters" },
                { label:"Confirm New Password",val:confPwd, set:setConfPwd, ph:"Repeat new password" },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:6 }}>{f.label}</label>
                  <input type="password" value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                    style={{ background:"rgba(6,13,26,0.8)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:9, padding:"11px 14px", color:"#eef0f8", fontFamily:"'DM Mono',monospace", fontSize:13, width:"100%", outline:"none" }}
                    onFocus={e=>e.target.style.borderColor=`${blue}55`}
                    onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.09)"}
                    onKeyDown={e=>{ if(e.key==="Enter") changePassword(); }}/>
                </div>
              ))}
              {newPwd && (
                <div>
                  <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                    <div style={{ height:"100%", borderRadius:2, transition:"all 0.3s",
                      width: newPwd.length < 6 ? "25%" : newPwd.length < 10 ? "55%" : newPwd.length < 14 ? "80%" : "100%",
                      background: newPwd.length < 6 ? red : newPwd.length < 10 ? amber : teal
                    }}/>
                  </div>
                  <div style={{ fontSize:9, color: newPwd.length < 6 ? red : newPwd.length < 10 ? amber : teal, fontFamily:"'DM Mono',monospace", marginTop:4 }}>
                    {newPwd.length < 6 ? "Too short" : newPwd.length < 10 ? "Fair" : newPwd.length < 14 ? "Good" : "Strong"}
                  </div>
                </div>
              )}
              {pwdMsg && (
                <div style={{ padding:"10px 14px", background:pwdMsg.ok?"rgba(0,212,160,0.08)":"rgba(255,90,106,0.08)", border:`1px solid ${pwdMsg.ok?teal:red}44`, borderRadius:8, fontSize:11, color:pwdMsg.ok?teal:red, fontFamily:"'DM Mono',monospace" }}>
                  {pwdMsg.ok ? "✓ " : "✕ "}{pwdMsg.text}
                </div>
              )}
              <button onClick={changePassword} disabled={pwdBusy}
                style={{ width:"100%", padding:"12px", background:`${blue}18`, border:`1px solid ${blue}55`, color:blue, borderRadius:10, cursor:pwdBusy?"wait":"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:15, opacity:pwdBusy?0.7:1, transition:"all 0.15s", marginTop:4 }}
                onMouseEnter={e=>{ if(!pwdBusy) e.currentTarget.style.background=`${blue}28`; }}
                onMouseLeave={e=>e.currentTarget.style.background=`${blue}18`}>
                {pwdBusy ? "Changing…" : "🔒 Change Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTOR DONUT CHART
// ─────────────────────────────────────────────────────────────────────────────
const SECTOR_COLORS = {
  "IT":             "#00b8ff",
  "Banking":        "#00d4a0",
  "Energy":         "#fbbf24",
  "FMCG":           "#a78bfa",
  "Telecom":        "#f472b6",
  "Infrastructure": "#fb923c",
  "Auto":           "#34d399",
  "Chemicals":      "#60a5fa",
  "Consumer Goods": "#f87171",
  "Other":          "#6b7280",
};

const SYMBOL_SECTOR = {
  TCS:"IT", INFY:"IT", WIPRO:"IT",
  HDFCBANK:"Banking", ICICIBANK:"Banking", SBIN:"Banking", AXISBANK:"Banking",
  RELIANCE:"Energy",
  BHARTIARTL:"Telecom",
  ITC:"FMCG", HINDUNILVR:"FMCG",
  LT:"Infrastructure",
  MARUTI:"Auto",
  ASIANPAINT:"Chemicals",
  TITAN:"Consumer Goods",
};

function SectorDonut({ portfolios, liveMap, companies }) {
  const [hovered, setHovered] = useState(null);

  const sectorMap = {};
  portfolios.forEach(p => {
    (p.holdings || []).forEach(h => {
      const company   = companies.find(c => c.symbol === h.companySymbol || String(c.id) === String(h.companyId));
      const ld        = company ? liveMap[company.id] : null;
      const price     = ld ? ld.price : parseFloat(h.averagePrice);
      const value     = price * parseFloat(h.quantity);
      const sector    = (company && company.sector) || SYMBOL_SECTOR[h.companySymbol] || "Other";
      sectorMap[sector] = (sectorMap[sector] || 0) + value;
    });
  });

  const entries = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);
  const total   = entries.reduce((s, [, v]) => s + v, 0);

  if (entries.length === 0) return null;

  const CX = 110, CY = 110, R = 80, INNER = 50;
  let angle = -Math.PI / 2;
  const slices = entries.map(([sector, value]) => {
    const pct   = value / total;
    const sweep = pct * 2 * Math.PI;
    const x1    = CX + R * Math.cos(angle);
    const y1    = CY + R * Math.sin(angle);
    angle      += sweep;
    const x2    = CX + R * Math.cos(angle);
    const y2    = CY + R * Math.sin(angle);
    const xi1   = CX + INNER * Math.cos(angle - sweep);
    const yi1   = CY + INNER * Math.sin(angle - sweep);
    const xi2   = CX + INNER * Math.cos(angle);
    const yi2   = CY + INNER * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const path  = `M${xi1} ${yi1} L${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${xi2} ${yi2} A${INNER} ${INNER} 0 ${large} 0 ${xi1} ${yi1} Z`;
    return { sector, value, pct, path };
  });

  const hov = hovered ? slices.find(s => s.sector === hovered) : null;

  return (
    <div className="glass-card" style={{ borderRadius:14, padding:"20px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <div style={{ width:3, height:16, background:blue, borderRadius:2 }}/>
        <span style={{ fontSize:11, color:"#6a7a9a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Sector Breakdown</span>
      </div>
      <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <svg width={220} height={220} viewBox="0 0 220 220">
            {slices.map(s => (
              <path key={s.sector} d={s.path}
                fill={SECTOR_COLORS[s.sector] || SECTOR_COLORS["Other"]}
                opacity={hovered ? (hovered === s.sector ? 1 : 0.3) : 0.85}
                style={{ cursor:"pointer", transition:"opacity 0.2s" }}
                onMouseEnter={() => setHovered(s.sector)}
                onMouseLeave={() => setHovered(null)}/>
            ))}
            <text x={CX} y={CY - 8} textAnchor="middle" fontSize="11"
              fill={hov ? (SECTOR_COLORS[hov.sector] || "#c8d4f0") : "#5a6a8a"}
              fontFamily="'DM Mono',monospace">
              {hov ? hov.sector : "Total"}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize="14"
              fill={hov ? (SECTOR_COLORS[hov.sector] || "#eef0f8") : "#eef0f8"}
              fontFamily="'Plus Jakarta Sans',sans-serif" fontWeight="700">
              {hov ? `${(hov.pct * 100).toFixed(1)}%` : `₹${fmtCap(total)}`}
            </text>
            {hov && (
              <text x={CX} y={CY + 26} textAnchor="middle" fontSize="10"
                fill="#5a6a8a" fontFamily="'DM Mono',monospace">
                ₹{fmtCap(hov.value)}
              </text>
            )}
          </svg>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1, minWidth:160 }}>
          {slices.map(s => (
            <div key={s.sector}
              style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", opacity:hovered&&hovered!==s.sector?0.4:1, transition:"opacity 0.2s" }}
              onMouseEnter={() => setHovered(s.sector)}
              onMouseLeave={() => setHovered(null)}>
              <div style={{ width:10, height:10, borderRadius:2, background:SECTOR_COLORS[s.sector]||SECTOR_COLORS["Other"], flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                  <span style={{ fontSize:11, color:"#c8d4f0", fontFamily:"'DM Mono',monospace" }}>{s.sector}</span>
                  <span style={{ fontSize:11, color:SECTOR_COLORS[s.sector]||"#c8d4f0", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{(s.pct*100).toFixed(1)}%</span>
                </div>
                <div style={{ marginTop:3, height:3, background:"#0e1828", borderRadius:2 }}>
                  <div style={{ height:"100%", width:`${s.pct*100}%`, background:SECTOR_COLORS[s.sector]||SECTOR_COLORS["Other"], borderRadius:2, transition:"width 0.5s" }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIP SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────
const SIP_HISTORY = {
  TCS:        [3100,3150,3200,3180,3220,3260,3300,3280,3320,3350,3380,3400,3420,3450,3430,3460,3480,3500,3520,3490,3510,3530,3490,3500],
  INFY:       [1250,1270,1290,1280,1300,1320,1310,1330,1350,1340,1360,1380,1370,1390,1400,1420,1410,1430,1440,1435,1445,1450,1455,1450],
  RELIANCE:   [2100,2150,2180,2160,2200,2230,2210,2250,2280,2260,2300,2320,2310,2340,2360,2380,2370,2400,2420,2410,2430,2440,2445,2450],
  HDFCBANK:   [1400,1420,1440,1430,1460,1480,1470,1490,1510,1500,1520,1540,1530,1560,1570,1590,1580,1600,1620,1610,1630,1640,1645,1650],
  ICICIBANK:  [940,960,970,950,980,1000,990,1010,1030,1020,1040,1060,1050,1070,1080,1090,1080,1090,1100,1090,1095,1100,1098,1100],
  WIPRO:      [360,368,374,370,378,385,382,388,394,390,396,402,398,405,410,412,408,414,418,415,418,420,419,420],
  BHARTIARTL: [1300,1320,1340,1330,1360,1380,1370,1390,1410,1400,1420,1440,1430,1460,1480,1490,1480,1500,1520,1510,1525,1540,1545,1550],
  ITC:        [385,390,395,392,398,405,402,408,415,410,418,425,420,428,435,438,433,440,445,442,446,448,449,450],
  SBIN:       [660,672,680,670,685,695,688,700,712,705,718,728,722,732,740,750,745,758,765,760,768,775,778,780],
  HINDUNILVR: [2100,2140,2180,2160,2200,2240,2220,2260,2290,2270,2310,2330,2320,2350,2370,2390,2380,2310,2320,2330,2340,2350,2348,2350],
  LT:         [3000,3060,3100,3080,3120,3160,3140,3180,3210,3190,3230,3260,3250,3280,3310,3330,3320,3350,3380,3370,3390,3420,3440,3450],
  AXISBANK:   [980,995,1010,1000,1020,1040,1030,1050,1070,1060,1080,1100,1090,1110,1120,1130,1125,1135,1145,1140,1148,1150,1149,1150],
  MARUTI:     [10800,11000,11200,11100,11300,11500,11400,11600,11800,11700,11900,12000,11900,12100,12200,12300,12250,12350,12420,12400,12450,12480,12490,12500],
  ASIANPAINT: [2500,2540,2580,2560,2600,2640,2620,2660,2690,2670,2710,2730,2720,2750,2770,2790,2780,2800,2820,2810,2830,2840,2848,2850],
  TITAN:      [2800,2850,2900,2880,2920,2960,2940,2980,3010,2990,3030,3060,3050,3080,3100,3110,3100,3120,3130,3125,3135,3145,3148,3150],
};

const SIP_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function SipSimulator({ companies, liveMap }) {
  const symbols  = Object.keys(SIP_HISTORY);
  const [symbol,    setSymbol]    = useState("TCS");
  const [monthly,   setMonthly]   = useState("5000");
  const [months,    setMonths]    = useState(12);
  const [hovIdx,    setHovIdx]    = useState(null);

  const amount   = parseFloat(monthly) || 0;
  const history  = SIP_HISTORY[symbol] || [];
  const slice    = history.slice(-months);

  let totalInvested = 0, totalUnits = 0;
  const monthly_data = slice.map((price, i) => {
    const units    = amount / price;
    totalUnits    += units;
    totalInvested += amount;
    const company  = companies.find(c => c.symbol === symbol);
    const ld       = company ? liveMap[company.id] : null;
    const curPrice = ld ? ld.price : slice[slice.length - 1];
    const curVal   = totalUnits * curPrice;
    return { price, units, totalInvested, totalUnits, curVal, month: i };
  });

  const finalData    = monthly_data[monthly_data.length - 1] || {};
  const currentValue = finalData.curVal || 0;
  const totalReturn  = currentValue - totalInvested;
  const returnPct    = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  const up           = totalReturn >= 0;
  const avgCost      = totalUnits > 0 ? totalInvested / totalUnits : 0;

  const W = 520, H = 120, PAD_L = 48, PAD_R = 12, PAD_T = 12, PAD_B = 28;
  const cW = W - PAD_L - PAD_R, cH = H - PAD_T - PAD_B;
  const vals = monthly_data.map(d => d.curVal);
  const minV = Math.min(...vals) * 0.97, maxV = Math.max(...vals) * 1.03;
  const valRange = maxV - minV || 1;
  const px   = i => PAD_L + (i / Math.max(vals.length - 1, 1)) * cW;
  const py   = v => PAD_T + cH - ((v - minV) / valRange) * cH;

  const invVals = monthly_data.map(d => d.totalInvested);
  const invPts  = invVals.map((v,i) => `${px(i)},${py(v)}`).join(" ");
  const valPts  = vals.map((v,i)    => `${px(i)},${py(v)}`).join(" ");
  const areaPath = vals.length > 1
    ? `M${px(0)},${py(vals[0])} ` + vals.map((v,i) => `L${px(i)},${py(v)}`).join(" ") + ` L${px(vals.length-1)},${PAD_T+cH} L${px(0)},${PAD_T+cH} Z`
    : "";

  const uid = "sip_chart";

  return (
    <div className="glass-card" style={{ borderRadius:14, padding:"20px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <div style={{ width:3, height:16, background:purple, borderRadius:2 }}/>
        <span style={{ fontSize:11, color:"#6a7a9a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>SIP Simulator</span>
        <span style={{ fontSize:9, color:"#3a4a6a", fontFamily:"'DM Mono',monospace", marginLeft:4 }}>Systematic Investment Plan — hypothetical back-test</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:18 }}>
        <div>
          <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:6 }}>Stock</label>
          <select value={symbol} onChange={e=>setSymbol(e.target.value)}
            style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:7, padding:"9px 12px", color:"#eef0f8", fontFamily:"'DM Mono',monospace", fontSize:12, width:"100%", outline:"none", cursor:"pointer" }}>
            {symbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:6 }}>Monthly Amount (₹)</label>
          <input type="number" value={monthly} onChange={e=>setMonthly(e.target.value)} min="100" step="500"
            style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:7, padding:"9px 12px", color:"#eef0f8", fontFamily:"'DM Mono',monospace", fontSize:12, width:"100%", outline:"none" }}
            onFocus={e=>e.target.style.borderColor=`${purple}55`}
            onBlur={e=>e.target.style.borderColor="#0e1828"}/>
        </div>
        <div>
          <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:6 }}>Duration: {months} months</label>
          <input type="range" min="3" max="24" value={months} onChange={e=>setMonths(Number(e.target.value))}
            style={{ width:"100%", marginTop:10, accentColor:purple }}/>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
            <span style={{ fontSize:8, color:"#3a4a6a", fontFamily:"'DM Mono',monospace" }}>3m</span>
            <span style={{ fontSize:8, color:"#3a4a6a", fontFamily:"'DM Mono',monospace" }}>24m</span>
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
        {[
          { label:"Total Invested",  val:`₹${fmtCap(totalInvested)}`,  color:"#c8d4f0" },
          { label:"Current Value",   val:`₹${fmtCap(currentValue)}`,   color:up?teal:red },
          { label:"Total Return",    val:`${up?"+":""}${returnPct.toFixed(2)}%`, color:up?teal:red },
          { label:"Avg Buy Price",   val:`₹${fmt(avgCost)}`,           color:amber },
        ].map(s => (
          <div key={s.label} style={{ background:"#060d1a", borderRadius:8, padding:"12px 14px" }}>
            <div style={{ fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:5 }}>{s.label}</div>
            <div style={{ fontSize:15, fontWeight:700, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"#060d1a", borderRadius:10, padding:"8px 4px 4px", position:"relative" }}
        onMouseLeave={() => setHovIdx(null)}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mx   = (e.clientX - rect.left) / rect.width * W;
            if (mx < PAD_L || mx > PAD_L + cW) { setHovIdx(null); return; }
            const idx  = Math.round(((mx - PAD_L) / cW) * (vals.length - 1));
            setHovIdx(Math.max(0, Math.min(vals.length - 1, idx)));
          }}>
          <defs>
            <linearGradient id={`${uid}_g`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor={up?teal:red} stopOpacity="0.2"/>
              <stop offset="100%" stopColor={up?teal:red} stopOpacity="0"/>
            </linearGradient>
          </defs>

          {[0.25,0.5,0.75,1].map(f => {
            const yy = PAD_T + cH * (1 - f);
            const vv = minV + (maxV - minV) * f;
            return (
              <g key={f}>
                <line x1={PAD_L} y1={yy} x2={PAD_L+cW} y2={yy} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                <text x={PAD_L-6} y={yy+4} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.2)" fontFamily="'DM Mono',monospace">{fmtCap(vv)}</text>
              </g>
            );
          })}

          <polyline points={invPts} fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth="1" strokeDasharray="4,3"/>
          {areaPath && <path d={areaPath} fill={`url(#${uid}_g)`}/>}
          {vals.length > 1 && <polyline points={valPts} fill="none" stroke={up?teal:red} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}

          {slice.map((_, i) => {
            if (i % Math.max(1, Math.floor(slice.length / 6)) !== 0 && i !== slice.length - 1) return null;
            const mIdx = (new Date().getMonth() - slice.length + 1 + i + 120) % 12;
            return (
              <text key={i} x={px(i)} y={PAD_T+cH+18} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.2)" fontFamily="'DM Mono',monospace">
                {SIP_MONTHS[mIdx]}
              </text>
            );
          })}

          {hovIdx !== null && (
            <>
              <line x1={px(hovIdx)} y1={PAD_T} x2={px(hovIdx)} y2={PAD_T+cH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3"/>
              <circle cx={px(hovIdx)} cy={py(vals[hovIdx])} r="4" fill={up?teal:red} style={{filter:`drop-shadow(0 0 4px ${up?teal:red})`}}/>
              <circle cx={px(hovIdx)} cy={py(invVals[hovIdx])} r="3" fill={amber} opacity="0.8"/>
            </>
          )}
        </svg>

        {hovIdx !== null && monthly_data[hovIdx] && (() => {
          const d   = monthly_data[hovIdx];
          const ret = d.curVal - d.totalInvested;
          const rp  = d.totalInvested > 0 ? (ret / d.totalInvested) * 100 : 0;
          const u   = ret >= 0;
          return (
            <div style={{ position:"absolute", top:8, left: hovIdx > monthly_data.length * 0.6 ? "auto" : `${(px(hovIdx)/W)*100+2}%`, right: hovIdx > monthly_data.length * 0.6 ? `${((W-px(hovIdx))/W*100)+2}%` : "auto", background:"#0a1525", border:`1px solid ${u?teal:red}44`, borderRadius:8, padding:"9px 13px", pointerEvents:"none", minWidth:150, zIndex:10 }}>
              <div style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace", letterSpacing:1, marginBottom:6 }}>Month {hovIdx + 1} of {months}</div>
              {[
                ["Invested",    `₹${fmtCap(d.totalInvested)}`,  "#c8d4f0"],
                ["Value",       `₹${fmtCap(d.curVal)}`,          u?teal:red],
                ["Return",      `${u?"+":""}${rp.toFixed(2)}%`,  u?teal:red],
                ["Units held",  d.totalUnits.toFixed(3),          amber],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:2 }}>
                  <span style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace" }}>{l}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:c, fontFamily:"'DM Mono',monospace" }}>{v}</span>
                </div>
              ))}
            </div>
          );
        })()}

        <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:6 }}>
          {[[up?teal:red, "Portfolio value", false],[amber, "Amount invested", true]].map(([c, lbl, dashed]) => (
            <div key={lbl} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke={c} strokeWidth={dashed?1:2} strokeDasharray={dashed?"4,3":"none"}/></svg>
              <span style={{ fontSize:9, color:"#5a6a8a", fontFamily:"'DM Mono',monospace" }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop:14, maxHeight:200, overflowY:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#060d1a", position:"sticky", top:0 }}>
              {["Month","Buy Price","Units","Invested","Value","Return"].map(h => (
                <th key={h} style={{ padding:"7px 12px", fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", textAlign:h==="Month"?"left":"right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthly_data.map((d, i) => {
              const ret = d.curVal - d.totalInvested;
              const rp  = d.totalInvested > 0 ? (ret / d.totalInvested) * 100 : 0;
              const u   = ret >= 0;
              const mIdx = (new Date().getMonth() - slice.length + 1 + i + 120) % 12;
              return (
                <tr key={i}
                  style={{ borderBottom:"1px solid rgba(255,255,255,0.02)", background:hovIdx===i?"rgba(255,255,255,0.03)":"transparent" }}
                  onMouseEnter={() => setHovIdx(i)}
                  onMouseLeave={() => setHovIdx(null)}>
                  <td style={{ padding:"7px 12px", fontSize:10, color:"#6a7a9a", fontFamily:"'DM Mono',monospace" }}>{SIP_MONTHS[mIdx]}</td>
                  <td style={{ padding:"7px 12px", textAlign:"right", fontSize:10, color:"#c8d4f0", fontFamily:"'DM Mono',monospace" }}>₹{fmt(d.price)}</td>
                  <td style={{ padding:"7px 12px", textAlign:"right", fontSize:10, color:amber, fontFamily:"'DM Mono',monospace" }}>{(amount/d.price).toFixed(3)}</td>
                  <td style={{ padding:"7px 12px", textAlign:"right", fontSize:10, color:"#c8d4f0", fontFamily:"'DM Mono',monospace" }}>₹{fmtCap(d.totalInvested)}</td>
                  <td style={{ padding:"7px 12px", textAlign:"right", fontSize:11, fontWeight:600, color:u?teal:red, fontFamily:"'DM Mono',monospace" }}>₹{fmtCap(d.curVal)}</td>
                  <td style={{ padding:"7px 12px", textAlign:"right", fontSize:11, fontWeight:600, color:u?teal:red, fontFamily:"'DM Mono',monospace" }}>{u?"+":""}{rp.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioModal({ mode, portfolio, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [name,   setName]   = useState(isEdit ? portfolio.name        : "");
  const [desc,   setDesc]   = useState(isEdit ? portfolio.description : "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Portfolio name is required"); return; }
    setSaving(true); setError("");
    try {
      if (isEdit) {
        await PORTFOLIO_API.put(`/portfolios/${portfolio.id}`, { name: name.trim(), description: desc.trim() });
      } else {
        await PORTFOLIO_API.post("/portfolios", { name: name.trim(), description: desc.trim() });
      }
      onSaved();
      onClose();
    } catch(e) {
      setError(e.response?.data?.message || "Failed to save portfolio");
    } finally { setSaving(false); }
  };

  const c = teal;
  return (
    <div onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(4,8,18,0.93)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9100, backdropFilter:"blur(12px)", padding:16 }}>
      <div style={{ background:"#080f1e", border:`1px solid ${c}33`, borderTop:`2px solid ${c}`, borderRadius:18, width:"100%", maxWidth:480, padding:"28px 32px", position:"relative" }}>

        <button onClick={onClose}
          style={{ position:"absolute", top:14, right:16, background:"rgba(255,255,255,0.04)", border:"1px solid #192030", color:"#4a5a7a", width:30, height:30, borderRadius:7, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e=>{ e.currentTarget.style.color="#eef0f8"; }}
          onMouseLeave={e=>{ e.currentTarget.style.color="#4a5a7a"; }}>✕</button>

        <div style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:6 }}>
          {isEdit ? "Edit Portfolio" : "New Portfolio"}
        </div>
        <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:20, fontWeight:800, color:"#eef0f8", marginBottom:22 }}>
          {isEdit ? `Rename "${portfolio.name}"` : "Create a portfolio"}
        </div>

        {error && (
          <div style={{ background:"rgba(255,90,106,0.08)", border:"1px solid rgba(255,90,106,0.3)", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:11, color:red, fontFamily:"'DM Mono',monospace" }}>
            ✕ {error}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:6 }}>Portfolio Name *</label>
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g. Long Term Growth"
            style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:8, padding:"10px 14px", color:"#eef0f8", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, width:"100%", outline:"none", transition:"border-color 0.2s" }}
            onFocus={e=>e.target.style.borderColor=`${c}55`}
            onBlur={e=>e.target.style.borderColor="#0e1828"}
            onKeyDown={e=>{ if(e.key==="Enter") submit(); }}/>
        </div>

        <div style={{ marginBottom:22 }}>
          <label style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:6 }}>Description (optional)</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="e.g. Blue-chip stocks for 5+ year horizon"
            rows={3}
            style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:8, padding:"10px 14px", color:"#eef0f8", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, width:"100%", outline:"none", resize:"vertical", transition:"border-color 0.2s" }}
            onFocus={e=>e.target.style.borderColor=`${c}55`}
            onBlur={e=>e.target.style.borderColor="#0e1828"}/>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"11px", background:"transparent", border:"1px solid #0e1828", color:"#3a4a6a", borderRadius:9, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2 }}
            onMouseEnter={e=>{ e.currentTarget.style.color="#c8d4f0"; e.currentTarget.style.borderColor="#3a4a6a"; }}
            onMouseLeave={e=>{ e.currentTarget.style.color="#3a4a6a"; e.currentTarget.style.borderColor="#0e1828"; }}>
            CANCEL
          </button>
          <button onClick={submit} disabled={saving}
            style={{ flex:2, padding:"11px", background:`${c}18`, border:`1px solid ${c}55`, color:c, borderRadius:9, cursor:saving?"wait":"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:14, opacity:saving?0.7:1, transition:"all 0.15s" }}
            onMouseEnter={e=>{ if(!saving) e.currentTarget.style.background=`${c}28`; }}
            onMouseLeave={e=>e.currentTarget.style.background=`${c}18`}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Portfolio"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO CARD
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioCard({ portfolio, liveMap, companies, onEdit, onDelete, onRefresh }) {
  const [expanded, setExpanded]   = useState(false);
  const [txView,   setTxView]     = useState(false);
  const [txns,     setTxns]       = useState([]);
  const [txLoading,setTxLoading]  = useState(false);

  const holdings = portfolio.holdings || [];
  const totalInvested = holdings.reduce((s, h) => s + parseFloat(h.totalInvestment || 0), 0);

  const currentValue = holdings.reduce((s, h) => {
    const company = companies.find(c =>
      c.symbol === h.companySymbol || String(c.id) === String(h.companyId)
    );
    const ld       = company ? (liveMap[company.id] || null) : null;
    const livePrice= ld ? ld.price : parseFloat(h.averagePrice);
    return s + livePrice * parseFloat(h.quantity);
  }, 0);

  const pnl    = currentValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
  const up     = pnl >= 0;

  const loadTxns = async () => {
    setTxLoading(true);
    try {
      const res = await PORTFOLIO_API.get(`/transactions/portfolio/${portfolio.id}`);
      setTxns(Array.isArray(res.data) ? res.data : []);
    } catch(e) { setTxns([]); }
    finally { setTxLoading(false); }
  };

  const handleTxView = () => {
    setTxView(v => {
      if (!v) loadTxns();
      return !v;
    });
  };

  return (
    <div style={{ borderRadius:16, overflow:"hidden", transition:"all 0.2s", background:"rgba(10,16,32,0.5)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.07)" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.14)"}
      onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>

      <div style={{ padding:"20px 22px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:17, color:"#eef0f8", marginBottom:3 }}>{portfolio.name}</div>
            {portfolio.description && (
              <div style={{ fontSize:11, color:"#3a4a6a", fontFamily:"'DM Mono',monospace" }}>{portfolio.description}</div>
            )}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={onEdit}
              style={{ background:"rgba(255,255,255,0.03)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.08)", color:"#5a6a8a", padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}
              onMouseEnter={e=>{ e.currentTarget.style.color=blue; e.currentTarget.style.borderColor=blue+"44"; }}
              onMouseLeave={e=>{ e.currentTarget.style.color="#5a6a8a"; e.currentTarget.style.borderColor="#0e1828"; }}>✎</button>
            <button onClick={onDelete}
              style={{ background:"transparent", border:"1px solid #0e1828", color:"#5a6a8a", padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}
              onMouseEnter={e=>{ e.currentTarget.style.color=red; e.currentTarget.style.borderColor=red+"44"; }}
              onMouseLeave={e=>{ e.currentTarget.style.color="#5a6a8a"; e.currentTarget.style.borderColor="#0e1828"; }}>✕</button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { label:"Invested",      val:`₹${fmtCap(totalInvested)}`,  color:"#c8d4f0" },
            { label:"Current Value", val:`₹${fmtCap(currentValue)}`,   color:up?teal:red },
            { label:"P&L",           val:`${up?"+":""}${pnlPct.toFixed(2)}%`, color:up?teal:red },
          ].map(s => (
            <div key={s.label} style={{ background:"rgba(6,13,26,0.6)", backdropFilter:"blur(8px)", borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:13, fontWeight:700, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setExpanded(v => !v)}
        style={{ width:"100%", padding:"11px 22px", background:"transparent", border:"none", borderBottom:expanded?"1px solid rgba(255,255,255,0.05)":"none", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"background 0.15s" }}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <span style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>
          {holdings.length} Holding{holdings.length !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize:10, color:"#3a4a6a", fontFamily:"'DM Mono',monospace" }}>{expanded ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {expanded && (
        <>
          {holdings.length === 0 ? (
            <div style={{ padding:"24px", textAlign:"center", color:"#3a4a6a", fontSize:11, fontFamily:"'DM Mono',monospace" }}>
              No holdings yet — buy shares from the Exchange tab
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:520 }}>
                <thead>
                  <tr style={{ background:"rgba(6,13,26,0.85)" }}>
                    {["Stock","Qty","Avg Price","Invested","Live Price","Current","P&L"].map(h => (
                      <th key={h} style={{ padding:"8px 14px", fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", textAlign:h==="Stock"?"left":"right", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map(h => {
                    const company  = companies.find(c =>
                      c.symbol === h.companySymbol || String(c.id) === String(h.companyId)
                    );
                    const ld         = company ? (liveMap[company.id] || null) : null;
                    const livePrice  = ld ? ld.price : parseFloat(h.averagePrice);
                    const avgPrice   = parseFloat(h.averagePrice);
                    const qty        = parseFloat(h.quantity);
                    const invested   = parseFloat(h.totalInvestment);
                    const curVal     = livePrice * qty;
                    const hPnl       = curVal - invested;
                    const hPnlPct    = invested > 0 ? (hPnl / invested) * 100 : 0;
                    const hUp        = hPnl >= 0;
                    return (
                      <tr key={h.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.02)" }}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.015)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:6, background:`${hUp?teal:red}15`, border:`1px solid ${hUp?teal:red}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:hUp?teal:red, flexShrink:0 }}>
                              {h.companySymbol.substring(0,3).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize:11, fontWeight:600, color:"#c8d4f0", fontFamily:"'DM Mono',monospace" }}>{h.companySymbol}</div>
                              <div style={{ fontSize:9, color:"#3a4a6a" }}>{h.companyName}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:"10px 14px", textAlign:"right", fontSize:12, color:"#eef0f8", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{qty}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", fontSize:11, color:"#6a7a9a", fontFamily:"'DM Mono',monospace" }}>₹{fmt(avgPrice)}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", fontSize:11, color:"#c8d4f0", fontFamily:"'DM Mono',monospace" }}>₹{fmtCap(invested)}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", fontSize:11, color:ld?teal:"#5a6a8a", fontFamily:"'DM Mono',monospace" }}>
                          {ld ? `₹${fmt(livePrice)}` : <span style={{ fontSize:9, color:"#3a4a6a" }}>no data</span>}
                        </td>
                        <td style={{ padding:"10px 14px", textAlign:"right", fontSize:11, color:hUp?teal:red, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>₹{fmtCap(curVal)}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right" }}>
                          <div style={{ fontSize:11, color:hUp?teal:red, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{hUp?"+":""}{hPnlPct.toFixed(2)}%</div>
                          <div style={{ fontSize:9, color:hUp?teal:red, fontFamily:"'DM Mono',monospace" }}>{hUp?"+":""}{hPnl >= 0 ? "" : "-"}₹{fmtCap(Math.abs(hPnl))}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <button onClick={handleTxView}
            style={{ width:"100%", padding:"10px 22px", background:"transparent", border:"none", borderTop:"1px solid #0e1828", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Transaction History</span>
            <span style={{ fontSize:10, color:"#3a4a6a", fontFamily:"'DM Mono',monospace" }}>{txView ? "▲ Hide" : "▼ Show"}</span>
          </button>

          {txView && (
            <div style={{ borderTop:"1px solid #0e1828" }}>
              {txLoading ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:24 }}>
                  <div style={{ width:14, height:14, border:`2px solid #0e1828`, borderTopColor:blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
                  <span style={{ fontSize:10, color:"#5a6a8a", letterSpacing:2 }}>LOADING…</span>
                </div>
              ) : txns.length === 0 ? (
                <div style={{ padding:"20px", textAlign:"center", color:"#3a4a6a", fontSize:10, fontFamily:"'DM Mono',monospace" }}>No transactions yet</div>
              ) : (
                <div style={{ maxHeight:220, overflowY:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:"rgba(6,13,26,0.9)", position:"sticky", top:0 }}>
                        {["Time","Stock","Type","Qty","Price","Total"].map(h => (
                          <th key={h} style={{ padding:"7px 14px", fontSize:8, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", textAlign:h==="Time"||h==="Stock"||h==="Type"?"left":"right" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map(tx => {
                        const isBuy = tx.transactionType === "BUY";
                        const c     = isBuy ? teal : red;
                        return (
                          <tr key={tx.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.02)" }}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.015)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <td style={{ padding:"8px 14px", fontSize:9, color:"#3a4a6a", fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>{fmtTime(tx.transactionDate)}</td>
                            <td style={{ padding:"8px 14px", fontSize:10, color:"#c8d4f0", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{tx.companySymbol}</td>
                            <td style={{ padding:"8px 14px" }}>
                              <span style={{ background:`${c}18`, border:`1px solid ${c}44`, color:c, padding:"2px 8px", borderRadius:4, fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>
                                {isBuy?"▲ BUY":"▼ SELL"}
                              </span>
                            </td>
                            <td style={{ padding:"8px 14px", textAlign:"right", fontSize:11, color:"#eef0f8", fontFamily:"'DM Mono',monospace" }}>{tx.quantity}</td>
                            <td style={{ padding:"8px 14px", textAlign:"right", fontSize:11, color:"#6a7a9a", fontFamily:"'DM Mono',monospace" }}>₹{fmt(tx.pricePerShare)}</td>
                            <td style={{ padding:"8px 14px", textAlign:"right", fontSize:11, color:c, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>₹{fmt(tx.totalAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color: c, icon }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:hov?"rgba(14,24,40,0.8)":"rgba(10,16,32,0.5)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:`1px solid ${hov?c+"44":"rgba(255,255,255,0.06)"}`, borderRadius:14, padding:"20px 22px", position:"relative", overflow:"hidden", transition:"all 0.22s", boxShadow:hov?`0 8px 32px ${c}12`:"none" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:c, opacity:hov?1:0.3 }}/>
      <div style={{ position:"absolute", top:-16, right:-16, width:72, height:72, borderRadius:"50%", background:`radial-gradient(circle,${c}18 0%,transparent 70%)`, opacity:hov?1:0.5 }}/>
      <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>
      <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:28, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginTop:6 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:c, fontFamily:"'DM Mono',monospace", marginTop:5 }}>{sub}</div>}
    </div>
  );
}

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(4,8,18,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)" }}>
      <div style={{ borderRadius:18, padding:"36px 44px", textAlign:"center", minWidth:300, background:"rgba(8,15,30,0.7)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(255,90,106,0.25)", borderTop:"2px solid #ff5a6a" }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚠</div>
        <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:"#eef0f8", marginBottom:8 }}>Sign Out</div>
        <div style={{ fontSize:11, color:"#5a6a8a", fontFamily:"'DM Mono',monospace", letterSpacing:1, marginBottom:26 }}>End your trading session?</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={onCancel}
            style={{ background:"transparent", border:"1px solid #0e1828", color:"#3a4a6a", padding:"9px 24px", borderRadius:8, fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, cursor:"pointer" }}
            onMouseEnter={e=>{ e.currentTarget.style.color="#c8d4f0"; e.currentTarget.style.borderColor="#3a4a6a"; }}
            onMouseLeave={e=>{ e.currentTarget.style.color="#3a4a6a"; e.currentTarget.style.borderColor="#0e1828"; }}>CANCEL</button>
          <button onClick={onConfirm}
            style={{ background:"rgba(255,90,106,0.12)", border:"1px solid rgba(255,90,106,0.35)", color:red, padding:"9px 24px", borderRadius:8, fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, cursor:"pointer" }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,90,106,0.22)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,90,106,0.12)"}>SIGN OUT</button>
        </div>
      </div>
    </div>
  );
}

function BackBtn({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"flex", alignItems:"center", gap:6, background:hov?"rgba(0,184,255,0.1)":"transparent", border:`1px solid ${hov?"rgba(0,184,255,0.35)":"#0e1828"}`, color:hov?blue:"#3a4a6a", padding:"6px 14px", borderRadius:7, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, textTransform:"uppercase", transition:"all 0.15s" }}>
      ← Back
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function Home({ onLogout }) {
  const [tab, setTab]               = useState("dashboard");
  const [companies, setCompanies]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("All");
  const [loading, setLoading]       = useState(true);
  const [orders,        setOrders]        = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [portfolios,        setPortfolios]        = useState([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(false);
  const [portfolioModal,    setPortfolioModal]    = useState(null);
  const [portfolioSubTab,   setPortfolioSubTab]   = useState("holdings");
  const [watchlist,   setWatchlist]   = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("sb_watchlist") || "[]")); }
    catch { return new Set(); }
  });
  const [alerts,      setAlerts]      = useState(() => {
    try { return JSON.parse(localStorage.getItem("sb_alerts") || "[]"); }
    catch { return []; }
  });
  const [alertToast,  setAlertToast]  = useState([]);
  const [alertModal,  setAlertModal]  = useState(null);
  const [showLogout,  setShowLogout]  = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [navWalletBal,  setNavWalletBal]  = useState(null);

  const refreshNavWallet = () => {
    PORTFOLIO_API.get("/wallet/balance")
      .then(r => setNavWalletBal(r.data.balance))
      .catch(() => setNavWalletBal(null));
  };
  const scrollRef = useRef(null);

  const { liveMap, connected, tickCount } = useExchange();

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await STOCK_API.get("/companies");
      setCompanies(res.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) { setOrders([]); setOrdersLoading(false); return; }
    setOrdersLoading(true);
    try {
      const res = await TRADE_API.get(`/trade/user/${userId}`);
      const all = Array.isArray(res.data) ? res.data : [];
      setOrders(all.filter(o => String(o.userId) === String(userId)));
    } catch(e) {
      console.warn("[Orders] fetch failed:", e.message);
      setOrders([]);
    } finally { setOrdersLoading(false); }
  };

  const fetchPortfolios = async () => {
    setPortfoliosLoading(true);
    try {
      const res = await PORTFOLIO_API.get("/portfolios");
      setPortfolios(Array.isArray(res.data) ? res.data : []);
    } catch(e) {
      setPortfolios([]);
    } finally { setPortfoliosLoading(false); }
  };

  const firedRef = useRef(new Set());

  const toggleWatchlist = (id) => setWatchlist(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    localStorage.setItem("sb_watchlist", JSON.stringify([...n]));
    return n;
  });

  const saveAlert = (a) => setAlerts(prev => {
    const n = [...prev.filter(x => !(x.companyId===a.companyId && x.direction===a.direction)), a];
    localStorage.setItem("sb_alerts", JSON.stringify(n));
    return n;
  });

  const removeAlert = (cid, dir) => setAlerts(prev => {
    const n = prev.filter(x => !(x.companyId===cid && x.direction===dir));
    localStorage.setItem("sb_alerts", JSON.stringify(n));
    return n;
  });

  useEffect(() => {
    if (!alerts.length) return;
    alerts.forEach(a => {
      const ld  = liveMap[a.companyId];
      if (!ld?.price) return;
      const key = `${a.companyId}_${a.direction}_${a.targetPrice}`;
      if (firedRef.current.has(key)) return;
      const hit = a.direction === "above" ? ld.price >= a.targetPrice : ld.price <= a.targetPrice;
      if (!hit) return;
      firedRef.current.add(key);
      if (Notification.permission === "granted")
        new Notification(`Price Alert: ${a.symbol}`, { body:`${a.symbol} hit ₹${a.targetPrice} — now ₹${ld.price.toFixed(2)}` });
      const id = Date.now() + Math.random();
      setAlertToast(p => [...p, { id, alert:a, price:ld.price }]);
      setTimeout(() => setAlertToast(p => p.filter(t => t.id !== id)), 6000);
    });
  }, [liveMap]);

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => { refreshNavWallet(); }, []);
  useEffect(() => { if (tab === "orders")    fetchOrders(); },    [tab]);
  useEffect(() => { if (tab === "portfolio") fetchPortfolios(); }, [tab]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [tab]);

  const getLD = (company) => getLive(liveMap, company) || defaultLive(company);

  const gainers     = companies.filter(c => (getLD(c).dayChangePct) >= 0 && getLD(c).price > 0).length;
  const hasLive     = companies.filter(c => getLD(c).price > 0).length;
  const nearCircuit = companies.filter(c => Math.abs(getLD(c).dayChangePct) >= 15).length;

  const filteredCompanies = companies.filter(c => {
    const q      = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || (c.symbol||"").toLowerCase().includes(q);
    const ld     = getLD(c);
    const dayPct = ld.dayChangePct;
    const matchF = filter==="All"     ? true
                 : filter==="Gainers" ? dayPct >= 0 && ld.price > 0
                 : filter==="Losers"  ? dayPct <  0 && ld.price > 0
                 : filter==="Circuit" ? Math.abs(dayPct) >= 15
                 : true;
    return matchQ && matchF;
  });

  const topGainers = [...companies].filter(c=>getLD(c).price>0).sort((a,b)=>getLD(b).dayChangePct-getLD(a).dayChangePct).slice(0,5);
  const topLosers  = [...companies].filter(c=>getLD(c).price>0).sort((a,b)=>getLD(a).dayChangePct-getLD(b).dayChangePct).slice(0,5);

  const NAV = [
    { id:"dashboard", icon:"◈", label:"Dashboard" },
    { id:"exchange",  icon:"◎", label:"Exchange"  },
    { id:"orders",    icon:"◑", label:"Orders"    },
    { id:"portfolio", icon:"◧", label:"Portfolio" },
    { id:"watchlist", icon:"☆", label:"Watchlist"  },
  ];
  const TH = { padding:"10px 16px", fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontWeight:400, fontFamily:"'DM Mono',monospace", textAlign:"left" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { height:100%; }
        body { background:linear-gradient(135deg,#02060e 0%,#060d1a 40%,#050b18 100%); overflow:hidden; min-height:100vh; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#0e1828; border-radius:4px; }
        ::placeholder { color:#1a2540 !important; }
        @keyframes pulseDot    { 0%,100%{opacity:1;box-shadow:0 0 5px ${teal};} 50%{opacity:0.3;box-shadow:none;} }
        @keyframes tickerScroll{ from{transform:translateX(0);} to{transform:translateX(-50%);} }
        @keyframes fadeUp      { from{opacity:0;transform:translateY(7px);} to{opacity:1;transform:translateY(0);} }
        @keyframes spin        { to{transform:rotate(360deg);} }
        @keyframes flashBadge  { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        @keyframes slideInRight{ from{transform:translateX(110%);opacity:0;} to{transform:translateX(0);opacity:1;} }
        @keyframes bellRing    { 0%,100%{transform:rotate(0);} 20%{transform:rotate(18deg);} 40%{transform:rotate(-14deg);} 60%{transform:rotate(10deg);} 80%{transform:rotate(-6deg);} }
        .fi { animation:fadeUp 0.28s ease both; }
        .glass-card { background:rgba(10,16,32,0.55); backdrop-filter:blur(22px); -webkit-backdrop-filter:blur(22px); border:1px solid rgba(255,255,255,0.08); box-shadow:0 8px 32px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.05); }
        .glass-row:hover td { background:rgba(255,255,255,0.025) !important; }
      `}</style>

      {showLogout  && <LogoutModal onConfirm={()=>{ setShowLogout(false); if(onLogout) onLogout(); }} onCancel={()=>setShowLogout(false)}/>}
      {showProfile && <ProfileModal onClose={()=>setShowProfile(false)} onDeposit={refreshNavWallet}/>}
      {selected && (
        <LiveDetailModal
          company={selected.company}
          liveData={getLD(selected.company)}
          onClose={()=>setSelected(null)}
        />
      )}
      {portfolioModal && (
        <PortfolioModal
          mode={portfolioModal === "create" ? "create" : "edit"}
          portfolio={portfolioModal === "create" ? null : portfolioModal}
          onClose={() => setPortfolioModal(null)}
          onSaved={fetchPortfolios}
        />
      )}
      {alertModal && (
        <AlertModal
          company={alertModal}
          livePrice={getLD(alertModal).price}
          existingAlerts={alerts}
          onSave={saveAlert}
          onRemove={removeAlert}
          onClose={() => setAlertModal(null)}
        />
      )}

      {/* Alert toasts */}
      <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:10,pointerEvents:"none"}}>
        {alertToast.map(t => {
          const a=t.alert; const up=a.direction==="above"; const c=up?teal:red;
          return (
            <div key={t.id} className="glass-card"
              style={{borderRadius:14,padding:"14px 18px",minWidth:280,borderLeft:`3px solid ${c}`,animation:"slideInRight 0.35s ease",pointerEvents:"auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontSize:14}}>🔔</span>
                <span style={{fontSize:10,fontWeight:700,color:c,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>PRICE ALERT</span>
              </div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:16,color:"#eef0f8"}}>{a.symbol}</div>
              <div style={{fontSize:11,color:"#6a7a9a",fontFamily:"'DM Mono',monospace",marginTop:3}}>
                {up?"Crossed ▲":"Dropped ▼"} ₹{fmt(a.targetPrice)} · now ₹{fmt(t.price)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#04080e", fontFamily:"'DM Mono',monospace", color:"#c8d4f0" }}>

        {/* Navbar */}
        <div style={{ background:"rgba(6,13,26,0.95)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.07)", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", flexShrink:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#00b8ff,#00d4a0)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:"#04080e" }}>S</div>
            <div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:"#eef0f8", letterSpacing:-0.3, lineHeight:1 }}>ShareBazaar</div>
              <div style={{ fontSize:9, color:"#7a8aaa", letterSpacing:3 }}>LIVE EXCHANGE</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:1, background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"3px" }}>
            {NAV.map(n => (
              <button key={n.id} onClick={()=>setTab(n.id)}
                style={{ background:tab===n.id?"rgba(0,184,255,0.14)":"transparent", border:"none", color:tab===n.id?"#eef0f8":"#4a5a7a", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1.5, textTransform:"uppercase", display:"flex", alignItems:"center", gap:6, transition:"all 0.18s", boxShadow:tab===n.id?"0 1px 8px rgba(0,184,255,0.15)":"none" }}
                onMouseEnter={e=>{ if(tab!==n.id){ e.currentTarget.style.color="#8a9aba"; e.currentTarget.style.background="rgba(255,255,255,0.04)"; } }}
                onMouseLeave={e=>{ if(tab!==n.id){ e.currentTarget.style.color="#4a5a7a"; e.currentTarget.style.background="transparent"; } }}>
                <span style={{ fontSize:12 }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:"4px 10px" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:connected?teal:red, boxShadow:connected?`0 0 6px ${teal}`:"none", animation:connected?"pulseDot 1.5s infinite":"none", flexShrink:0 }}/>
              <span style={{ fontSize:9, color:connected?teal:"#ff5a6a", letterSpacing:1, fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>
                {connected ? "LIVE" : "OFF"}
              </span>
            </div>
            <button onClick={fetchCompanies} title="Refresh companies"
              style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", color:"#5a6a8a", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.color=blue; e.currentTarget.style.borderColor=blue+"44"; e.currentTarget.style.background="rgba(0,184,255,0.08)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.color="#5a6a8a"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}>↻</button>
            <button onClick={()=>setShowProfile(true)}
              style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:10, padding:"5px 10px 5px 6px", cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(0,184,255,0.07)"; e.currentTarget.style.borderColor="rgba(0,184,255,0.3)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.09)"; }}>
              <div style={{ width:26, height:26, borderRadius:8, background:`linear-gradient(135deg,${blue}55,${purple}55)`, border:`1px solid ${blue}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#eef0f8", flexShrink:0 }}>
                {(localStorage.getItem("username")||"U").substring(0,1).toUpperCase()}
              </div>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#c8d4f0", fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.2 }}>
                  {localStorage.getItem("username") || "User"}
                </div>
                {navWalletBal !== null && (
                  <div style={{ fontSize:9, color:teal, fontFamily:"'DM Mono',monospace", letterSpacing:0.5 }}>
                    ₹{fmtCap(navWalletBal)}
                  </div>
                )}
              </div>
            </button>
            <button onClick={()=>setShowLogout(true)} title="Sign out"
              style={{ width:30, height:30, borderRadius:8, background:"rgba(255,90,106,0.07)", border:"1px solid rgba(255,90,106,0.18)", color:"#ff5a6a", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,90,106,0.18)"; e.currentTarget.style.borderColor="rgba(255,90,106,0.45)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,90,106,0.07)"; e.currentTarget.style.borderColor="rgba(255,90,106,0.18)"; }}>⏻</button>
          </div>
        </div>

        {/* Ticker tape */}
        {companies.filter(c=>getLD(c).price>0).length > 0 && (
          <div style={{ overflow:"hidden", borderBottom:"1px solid #0e1828", background:"#060d1a", padding:"6px 0", flexShrink:0 }}>
            <div style={{ display:"inline-flex", gap:36, animation:"tickerScroll 35s linear infinite", whiteSpace:"nowrap" }}>
              {(() => {
                const live = companies.filter(c=>getLD(c).price>0);
                return [...live,...live,...live].map((c,i) => {
                  const ld  = getLD(c);
                  const up  = ld.dayChangePct >= 0;
                  const col = up ? teal : red;
                  return (
                    <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:11, fontFamily:"'DM Mono',monospace" }}>
                      <span style={{ color:"#3a4a6a", letterSpacing:1 }}>{c.symbol||c.name.substring(0,5).toUpperCase()}</span>
                      <span style={{ color:"#c8d4f0" }}>₹{fmt(ld.price)}</span>
                      <span style={{ color:col }}>{up?"▲":"▼"}{ld.dayChangePct>=0?"+":""}{ld.dayChangePct.toFixed(2)}%</span>
                    </span>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:14 }}>
            <div style={{ width:20, height:20, border:`2px solid #0e1828`, borderTopColor:blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
            <span style={{ fontSize:11, color:"#5a6a8a", letterSpacing:3 }}>LOADING MARKET DATA…</span>
          </div>
        ) : (
          <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:"auto", padding:"24px 28px 40px" }}>

            {/* DASHBOARD */}
            {tab === "dashboard" && (
              <div className="fi" style={{ display:"flex", flexDirection:"column", gap:22 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                  <div>
                    <div style={{ fontSize:9, color:"#4a5a7a", letterSpacing:4, textTransform:"uppercase", marginBottom:4 }}>Market Overview</div>
                    <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:26, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>Dashboard</h1>
                  </div>
                  <div style={{ fontSize:10, color:"#4a5a7a", letterSpacing:1 }}>
                    {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
                  <StatCard icon="⬡" label="Companies"    value={companies.length||"—"} color={blue}  sub={`${hasLive} with live data`}/>
                  <StatCard icon="▲" label="Gainers"       value={gainers}               color={teal}  sub="today"/>
                  <StatCard icon="▼" label="Losers"        value={hasLive-gainers}        color={red}   sub="today"/>
                  <StatCard icon="⚡" label="Near Circuit" value={nearCircuit}            color={amber} sub="≥15% move"/>
                </div>

                {(topGainers.length > 0 || topLosers.length > 0) && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    {[["Top Gainers",topGainers,teal],["Top Losers",topLosers,red]].map(([title,list,c]) => (
                      <div key={title} className="glass-card" style={{ borderRadius:14, overflow:"hidden" }}>
                        <div style={{ padding:"14px 18px", borderBottom:"1px solid #0e1828", display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:3, height:16, background:c, borderRadius:2 }}/>
                          <span style={{ fontSize:11, color:"#6a7a9a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{title}</span>
                        </div>
                        {list.map(company => {
                          const ld  = getLD(company);
                          const up  = ld.dayChangePct >= 0;
                          return (
                            <div key={company.id} onClick={()=>setSelected({ company, liveData:ld })}
                              style={{ padding:"11px 18px", borderBottom:"1px solid #060d1a", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", transition:"background 0.15s" }}
                              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <div style={{ background:`${c}15`, border:`1px solid ${c}30`, color:c, padding:"2px 8px", borderRadius:4, fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>
                                  {company.symbol||company.name.substring(0,5).toUpperCase()}
                                </div>
                                <span style={{ fontSize:12, color:"#eef0f8", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>₹{fmt(ld.price)}</span>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <LiveSparkline history={ld.history} width={40} height={18}/>
                                <span style={{ fontSize:12, color:up?teal:red, fontFamily:"'DM Mono',monospace", fontWeight:600, minWidth:65, textAlign:"right" }}>
                                  {up?"+":""}{ld.dayChangePct.toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {list.length===0 && <div style={{ padding:20, textAlign:"center", color:"#2a3550", fontSize:11 }}>None</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <div style={{ width:3, height:20, background:blue, borderRadius:2, boxShadow:`0 0 8px ${blue}88` }}/>
                    <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:16, color:"#eef0f8" }}>All Companies</span>
                    <span style={{ fontSize:10, color:"#2a3550", fontFamily:"'DM Mono',monospace" }}>({companies.length} total · {hasLive} with live data)</span>
                    <button onClick={()=>setTab("exchange")}
                      style={{ marginLeft:"auto", background:"transparent", border:"1px solid #0e1828", color:"#5a6a8a", padding:"4px 12px", borderRadius:6, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:2, transition:"all 0.15s" }}
                      onMouseEnter={e=>{ e.currentTarget.style.color=blue; e.currentTarget.style.borderColor=blue+"44"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.color="#2a3550"; e.currentTarget.style.borderColor="#0e1828"; }}>LIVE EXCHANGE →</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                    {companies.map((c, i) => {
                      const ld    = getLD(c);
                      const live  = ld.price > 0;
                      const up    = ld.dayChangePct >= 0;
                      const color = live ? (up ? teal : red) : "#2a3550";
                      const ac    = i%4===0?blue:i%4===1?teal:i%4===2?amber:purple;
                      return (
                        <div key={c.id} onClick={()=>setSelected({ company:c, liveData:ld })} className="fi"
                          style={{ animationDelay:`${Math.min(i*35,350)}ms`, background:"rgba(10,16,32,0.5)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", border:`1px solid ${color}22`, borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"all 0.2s" }}
                          onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${color}66`; e.currentTarget.style.background="rgba(14,24,40,0.7)"; }}
                          onMouseLeave={e=>{ e.currentTarget.style.borderColor=`${color}22`; e.currentTarget.style.background="#0a1020"; }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                            <div style={{ width:36, height:36, borderRadius:8, background:`${ac}15`, border:`1px solid ${ac}30`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:13, color:ac }}>
                              {(c.symbol||c.name).substring(0,2).toUpperCase()}
                            </div>
                            {live ? <LiveSparkline history={ld.history} width={50} height={22}/> : <span style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace", marginTop:4 }}>NO DATA</span>}
                          </div>
                          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13, color:"#c8d4f0", marginBottom:2 }}>{c.name}</div>
                          <div style={{ fontSize:9, color:"#3a4a6a", fontFamily:"'DM Mono',monospace", marginBottom:6 }}>{c.symbol} · {c.sector}</div>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:17, color:live?"#eef0f8":"#2a3550" }}>
                              {live ? `₹${fmt(ld.price)}` : "Not listed"}
                            </div>
                            {live && (
                              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                                <span style={{ fontSize:11, color, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{up?"+":""}{ld.dayChangePct.toFixed(2)}%</span>
                                <CircuitBadge dayPct={ld.dayChangePct}/>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* EXCHANGE */}
            {tab === "exchange" && (
              <div className="fi" style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <BackBtn onClick={()=>setTab("dashboard")}/>
                    <div>
                      <div style={{ fontSize:9, color:"#4a5a7a", letterSpacing:4, textTransform:"uppercase", marginBottom:2 }}>Live Market</div>
                      <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:24, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>Exchange</h1>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:connected?teal:red, animation:connected?"pulseDot 1.5s infinite":"none" }}/>
                    <span style={{ fontSize:9, color:connected?teal:red, letterSpacing:2 }}>{connected?"WS · 1S TICKS":"RECONNECTING"}</span>
                  </div>
                </div>

                {companies.length !== hasLive && (
                  <div style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ color:amber, fontSize:14 }}>⚠</span>
                    <span style={{ fontSize:11, color:amber, fontFamily:"'DM Mono',monospace" }}>
                      {companies.length - hasLive} company/companies are in stock-service but not in trade-service.
                    </span>
                  </div>
                )}

                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <div style={{ position:"relative", flex:1, minWidth:220 }}>
                    <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"#4a5a7a", fontSize:14 }}>⌕</span>
                    <input placeholder="Search company or symbol…" value={search} onChange={e=>setSearch(e.target.value)}
                      style={{ background:"rgba(6,13,26,0.7)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"9px 12px 9px 32px", color:"#c8d4f0", fontFamily:"'DM Mono',monospace", fontSize:12, outline:"none", width:"100%", transition:"border-color 0.2s" }}
                      onFocus={e=>e.target.style.borderColor="#1e3a5a"} onBlur={e=>e.target.style.borderColor="#0e1828"}/>
                  </div>
                  {["All","Gainers","Losers","Circuit"].map(f => (
                    <button key={f} onClick={()=>setFilter(f)}
                      style={{ background:filter===f?"rgba(0,184,255,0.12)":"rgba(255,255,255,0.02)", backdropFilter:"blur(8px)", border:`1px solid ${filter===f?"rgba(0,184,255,0.4)":"rgba(255,255,255,0.07)"}`, color:filter===f?blue:"#2a3550", padding:"8px 14px", borderRadius:7, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1, textTransform:"uppercase", transition:"all 0.15s" }}>{f}</button>
                  ))}
                </div>

                <div className="glass-card" style={{ borderRadius:14, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(6,13,26,0.8)" }}>
                        {["Company","Live Price","Day Chg","Open","High","Low","Trend",""].map(h => (
                          <th key={h} style={{ ...TH, textAlign:["Live Price","Day Chg","Open","High","Low"].includes(h)?"right":"left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map(company => (
                        <LiveCompanyRow
                          key={company.id}
                          company={company}
                          liveData={getLD(company)}
                          onClick={(c,ld)=>setSelected({ company:c, liveData:ld })}
                          watchlist={watchlist}
                          alerts={alerts}
                          onToggleWatch={toggleWatchlist}
                          onSetAlert={c=>setAlertModal(c)}
                        />
                      ))}
                    </tbody>
                  </table>
                  {filteredCompanies.length===0 && (
                    <div style={{ textAlign:"center", padding:48, color:"#4a5a7a", fontSize:11, letterSpacing:2 }}>NO COMPANIES MATCH</div>
                  )}
                </div>
                <div style={{ height:24 }}/>
              </div>
            )}

            {/* ORDERS */}
            {tab === "orders" && (
              <div className="fi" style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:9, color:"#4a5a7a", letterSpacing:4, textTransform:"uppercase", marginBottom:2 }}>My Activity</div>
                    <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:24, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>Orders</h1>
                  </div>
                  <button onClick={fetchOrders}
                    style={{ background:"transparent", border:"1px solid #0e1828", color:"#5a6a8a", padding:"7px 16px", borderRadius:7, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:2, transition:"all 0.15s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.color=blue; e.currentTarget.style.borderColor=blue+"44"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.color="#2a3550"; e.currentTarget.style.borderColor="#0e1828"; }}>
                    ↻ Refresh
                  </button>
                </div>

                {orders.length > 0 && (() => {
                  const buys   = orders.filter(o => o.side === "BUY");
                  const sells  = orders.filter(o => o.side === "SELL");
                  const filled = orders.filter(o => o.status === "EXECUTED" || o.status === "FILLED");
                  const totalVal = filled.reduce((s,o) => s + o.price * o.quantity, 0);
                  return (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
                      {[
                        { label:"Total Orders",  val:orders.length,          color:blue },
                        { label:"Buy Orders",    val:buys.length,            color:teal },
                        { label:"Sell Orders",   val:sells.length,           color:red  },
                        { label:"Executed",      val:filled.length,          color:teal },
                        { label:"Traded Value",  val:`₹${fmtCap(totalVal)}`, color:amber },
                      ].map(s => (
                        <div key={s.label} style={{ background:"#0a1020", border:`1px solid ${s.color}22`, borderRadius:10, padding:"14px 16px" }}>
                          <div style={{ fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:6 }}>{s.label}</div>
                          <div style={{ fontSize:20, fontWeight:800, color:s.color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="glass-card" style={{ borderRadius:14, overflow:"hidden" }}>
                  {ordersLoading ? (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:48 }}>
                      <div style={{ width:18, height:18, border:`2px solid #0e1828`, borderTopColor:blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
                      <span style={{ fontSize:11, color:"#5a6a8a", letterSpacing:2 }}>LOADING ORDERS…</span>
                    </div>
                  ) : !localStorage.getItem("userId") ? (
                    <div style={{ textAlign:"center", padding:56 }}>
                      <div style={{ fontSize:32, marginBottom:10 }}>⚠</div>
                      <div style={{ fontSize:11, color:amber, letterSpacing:3, fontFamily:"'DM Mono',monospace" }}>SESSION NOT FOUND</div>
                    </div>
                  ) : orders.length === 0 ? (
                    <div style={{ textAlign:"center", padding:56 }}>
                      <div style={{ fontSize:32, marginBottom:10 }}>◑</div>
                      <div style={{ fontSize:11, color:"#7a8aaa", letterSpacing:3, fontFamily:"'DM Mono',monospace" }}>NO ORDERS YET</div>
                      <div style={{ fontSize:10, color:"#3a4a6a", marginTop:6 }}>Go to Exchange → click a company → Trade tab</div>
                    </div>
                  ) : (
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(6,13,26,0.85)" }}>
                          {["#","Company","Side","Type","Qty","Price","Value","Status","Time"].map(h => (
                            <th key={h} style={{ padding:"10px 14px", fontSize:9, color:"#5a6a8a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", textAlign:["Qty","Price","Value"].includes(h)?"right":"left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...orders].reverse().map((order, i) => {
                          const isBuy   = order.side === "BUY";
                          const isExec  = order.status === "EXECUTED" || order.status === "FILLED";
                          const isPend  = order.status === "PENDING";
                          const sideCol = isBuy ? teal : red;
                          const statCol = isExec ? teal : isPend ? amber : "#6a7a9a";
                          const company = companies.find(c => c.id === order.companyId);
                          const val     = order.price * order.quantity;
                          return (
                            <tr key={order.id}
                              style={{ borderBottom:"1px solid #090f1e", transition:"background 0.15s" }}
                              onMouseEnter={e=>e.currentTarget.style.background="rgba(0,184,255,0.02)"}
                              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                              <td style={{ padding:"13px 14px", fontSize:10, color:"#4a5a7a", fontFamily:"'DM Mono',monospace" }}>
                                {String(orders.length - i).padStart(3,"0")}
                              </td>
                              <td style={{ padding:"13px 14px" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <div style={{ width:30, height:30, borderRadius:7, background:`${sideCol}15`, border:`1px solid ${sideCol}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:sideCol, flexShrink:0 }}>
                                    {(company?.symbol || company?.name || `#${order.companyId}`).substring(0,3).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontSize:12, fontWeight:600, color:"#c8d4f0", fontFamily:"'DM Mono',monospace" }}>{company?.name || `Company #${order.companyId}`}</div>
                                    <div style={{ fontSize:9, color:"#5a6a8a" }}>ID #{order.companyId}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding:"13px 14px" }}>
                                <span style={{ background:`${sideCol}18`, border:`1px solid ${sideCol}44`, color:sideCol, padding:"3px 10px", borderRadius:5, fontSize:10, fontFamily:"'DM Mono',monospace", fontWeight:700, letterSpacing:1 }}>
                                  {isBuy ? "▲ BUY" : "▼ SELL"}
                                </span>
                              </td>
                              <td style={{ padding:"13px 14px" }}>
                                <span style={{ background:"rgba(167,139,250,0.1)", color:purple, padding:"3px 8px", borderRadius:4, fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>
                                  {order.orderType || "MARKET"}
                                </span>
                              </td>
                              <td style={{ padding:"13px 14px", textAlign:"right", fontSize:13, fontWeight:600, color:"#eef0f8", fontFamily:"'DM Mono',monospace" }}>{order.quantity}</td>
                              <td style={{ padding:"13px 14px", textAlign:"right" }}>
                                <div style={{ fontSize:13, fontWeight:700, color:"#eef0f8", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>₹{fmt(order.price)}</div>
                              </td>
                              <td style={{ padding:"13px 14px", textAlign:"right" }}>
                                <div style={{ fontSize:12, color:blue, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>₹{fmt(val)}</div>
                              </td>
                              <td style={{ padding:"13px 14px" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                  <div style={{ width:5, height:5, borderRadius:"50%", background:statCol, boxShadow:isExec?`0 0 5px ${statCol}`:"none" }}/>
                                  <span style={{ fontSize:10, color:statCol, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>{order.status}</span>
                                </div>
                              </td>
                              <td style={{ padding:"13px 14px", fontSize:10, color:"#3a4a6a", fontFamily:"'DM Mono',monospace" }}>
                                {fmtTime(order.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                <div style={{ height:24 }}/>
              </div>
            )}

            {/* PORTFOLIO */}
            {tab === "portfolio" && (
              <div className="fi" style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                  <div>
                    <div style={{ fontSize:9, color:"#4a5a7a", letterSpacing:4, textTransform:"uppercase", marginBottom:4 }}>My Investments</div>
                    <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:26, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>Portfolio</h1>
                  </div>
                  <button onClick={() => setPortfolioModal("create")}
                    style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(0,212,160,0.12)", border:"1px solid rgba(0,212,160,0.35)", color:teal, padding:"9px 18px", borderRadius:9, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, textTransform:"uppercase", transition:"all 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(0,212,160,0.22)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(0,212,160,0.12)"}>
                    + New Portfolio
                  </button>
                </div>

                {portfoliosLoading ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:60 }}>
                    <div style={{ width:18, height:18, border:`2px solid #0e1828`, borderTopColor:blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
                    <span style={{ fontSize:11, color:"#5a6a8a", letterSpacing:3 }}>LOADING PORTFOLIOS…</span>
                  </div>
                ) : portfolios.length === 0 ? (
                  <div style={{ background:"#0a1020", border:"1px solid #0e1828", borderRadius:16, padding:"64px 28px", textAlign:"center" }}>
                    <div style={{ fontSize:36, marginBottom:14, opacity:0.3 }}>◧</div>
                    <div style={{ fontSize:13, color:"#7a8aaa", letterSpacing:2, fontFamily:"'DM Mono',monospace", marginBottom:8 }}>NO PORTFOLIOS YET</div>
                    <div style={{ fontSize:11, color:"#3a4a6a", marginBottom:24 }}>Create a portfolio to start tracking your investments</div>
                    <button onClick={() => setPortfolioModal("create")}
                      style={{ background:"rgba(0,212,160,0.12)", border:"1px solid rgba(0,212,160,0.35)", color:teal, padding:"10px 24px", borderRadius:8, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2 }}>
                      + Create First Portfolio
                    </button>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const totalInvested = portfolios.reduce((sum, p) =>
                        sum + (p.holdings||[]).reduce((s, h) => s + parseFloat(h.totalInvestment||0), 0), 0);
                      const totalHoldings = portfolios.reduce((sum, p) => sum + (p.holdings||[]).length, 0);
                      const totalStocks   = new Set(portfolios.flatMap(p => (p.holdings||[]).map(h => h.companySymbol))).size;
                      return (
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                          {[
                            { icon:"◧", label:"Portfolios",      val:portfolios.length,        color:blue  },
                            { icon:"⬡", label:"Active Holdings",  val:totalHoldings,            color:teal  },
                            { icon:"◈", label:"Unique Stocks",    val:totalStocks,              color:purple},
                            { icon:"₹", label:"Total Invested",   val:`₹${fmtCap(totalInvested)}`, color:amber },
                          ].map(s => (
                            <div key={s.label} style={{ background:"#0a1020", border:`1px solid ${s.color}22`, borderRadius:12, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
                              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:s.color, opacity:0.4 }}/>
                              <div style={{ fontSize:18, marginBottom:8, color:s.color }}>{s.icon}</div>
                              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:24, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5 }}>{s.val}</div>
                              <div style={{ fontSize:9, color:"#5a6a8a", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginTop:5 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div style={{ display:"flex", gap:0, background:"#060d1a", borderRadius:10, padding:3, border:"1px solid #0e1828" }}>
                      {[
                        { id:"holdings", label:"Holdings" },
                        { id:"sector",   label:"Sector Breakdown" },
                        { id:"sip",      label:"SIP Simulator" },
                      ].map(t => (
                        <button key={t.id} onClick={() => setPortfolioSubTab(t.id)}
                          style={{ flex:1, padding:"8px", border:"none", borderRadius:8, background:portfolioSubTab===t.id?"#0a1020":"transparent", color:portfolioSubTab===t.id?"#eef0f8":"#3a4a6a", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, cursor:"pointer", transition:"all 0.15s", textTransform:"uppercase" }}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {portfolioSubTab === "holdings" && (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(420px,1fr))", gap:14 }}>
                        {portfolios.map(p => (
                          <PortfolioCard
                            key={p.id}
                            portfolio={p}
                            liveMap={liveMap}
                            companies={companies}
                            onEdit={() => setPortfolioModal(p)}
                            onDelete={async () => {
                              if (!window.confirm(`Delete "${p.name}"?`)) return;
                              try {
                                await PORTFOLIO_API.delete(`/portfolios/${p.id}`);
                                fetchPortfolios();
                              } catch(e) { alert(e.response?.data?.message || "Delete failed"); }
                            }}
                            onRefresh={fetchPortfolios}
                          />
                        ))}
                      </div>
                    )}

                    {portfolioSubTab === "sector" && (
                      <SectorDonut portfolios={portfolios} liveMap={liveMap} companies={companies}/>
                    )}

                    {portfolioSubTab === "sip" && (
                      <SipSimulator companies={companies} liveMap={liveMap}/>
                    )}
                  </>
                )}
                <div style={{ height:24 }}/>
              </div>
            )}

            {/* WATCHLIST */}
            {tab === "watchlist" && (
              <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                  <div>
                    <div style={{fontSize:9,color:"#4a5a7a",letterSpacing:4,textTransform:"uppercase",marginBottom:4}}>My Stars</div>
                    <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:26,fontWeight:800,color:"#eef0f8",letterSpacing:-0.5,lineHeight:1}}>Watchlist</h1>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {alerts.length>0&&(
                      <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,184,255,0.08)",border:"1px solid rgba(0,184,255,0.2)",borderRadius:8,padding:"6px 12px"}}>
                        <span style={{fontSize:11}}>🔔</span>
                        <span style={{fontSize:10,color:blue,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>{alerts.length} alert{alerts.length!==1?"s":""}</span>
                      </div>
                    )}
                    <button onClick={()=>setTab("exchange")}
                      style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#5a6a8a",padding:"7px 14px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.color=amber;e.currentTarget.style.borderColor="rgba(251,191,36,0.4)";}}
                      onMouseLeave={e=>{e.currentTarget.style.color="#5a6a8a";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}>
                      ☆ ADD FROM EXCHANGE
                    </button>
                  </div>
                </div>

                {watchlist.size===0 ? (
                  <div className="glass-card" style={{borderRadius:18,padding:"64px 28px",textAlign:"center"}}>
                    <div style={{fontSize:48,marginBottom:16,opacity:0.15}}>☆</div>
                    <div style={{fontSize:13,color:"#7a8aaa",letterSpacing:2,fontFamily:"'DM Mono',monospace",marginBottom:8}}>NO STOCKS WATCHED</div>
                    <div style={{fontSize:11,color:"#3a4a6a",marginBottom:24}}>Click the ☆ on any stock in Exchange to add it here</div>
                    <button onClick={()=>setTab("exchange")}
                      style={{background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",color:amber,padding:"10px 24px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:2}}>
                      GO TO EXCHANGE
                    </button>
                  </div>
                ) : (
                  <>
                    {(()=>{
                      const watched=companies.filter(c=>watchlist.has(c.id));
                      const gW=watched.filter(c=>(getLD(c).dayChangePct||0)>=0&&getLD(c).price>0).length;
                      const aW=watched.filter(c=>alerts.some(a=>a.companyId===c.id)).length;
                      return (
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                          {[
                            {label:"Watching",    val:watchlist.size, color:amber},
                            {label:"Up Today",    val:gW,             color:teal},
                            {label:"With Alerts", val:aW,             color:blue},
                          ].map(s=>(
                            <div key={s.label} className="glass-card" style={{borderRadius:12,padding:"16px 18px"}}>
                              <div style={{fontSize:9,color:"#5a6a8a",letterSpacing:3,textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:5}}>{s.label}</div>
                              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:26,fontWeight:800,color:s.color}}>{s.val}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:12}}>
                      {companies.filter(c=>watchlist.has(c.id)).map(c=>(
                        <WatchlistCard key={c.id} company={c} liveData={getLD(c)} alerts={alerts}
                          onRemove={toggleWatchlist}
                          onSetAlert={co=>setAlertModal(co)}
                          onOpenDetail={(co,ld)=>setSelected({company:co,liveData:ld})}/>
                      ))}
                    </div>

                    {alerts.length>0&&(
                      <div className="glass-card" style={{borderRadius:14,overflow:"hidden"}}>
                        <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:14}}>🔔</span>
                          <span style={{fontSize:10,color:"#6a7a9a",letterSpacing:2,textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>Price Alerts</span>
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse"}}>
                          <thead>
                            <tr style={{background:"rgba(6,13,26,0.8)"}}>
                              {["Stock","Direction","Target","Current","Gap",""].map(h=>(
                                <th key={h} style={{padding:"9px 16px",fontSize:8,color:"#5a6a8a",letterSpacing:2,textTransform:"uppercase",fontFamily:"'DM Mono',monospace",textAlign:h==="Stock"||h===""?"left":"right"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {alerts.map((a,i)=>{
                              const comp=companies.find(c=>c.id===a.companyId);
                              const ld=comp?getLD(comp):null;
                              const cur=ld?ld.price:0;
                              const gap=cur>0?((a.targetPrice-cur)/cur*100):null;
                              const dirUp=a.direction==="above";
                              const hit=dirUp?cur>=a.targetPrice:cur<=a.targetPrice;
                              return (
                                <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}
                                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                  <td style={{padding:"11px 16px",fontSize:12,fontWeight:600,color:"#c8d4f0",fontFamily:"'DM Mono',monospace"}}>{a.symbol}</td>
                                  <td style={{padding:"11px 16px",textAlign:"right"}}>
                                    <span style={{background:dirUp?"rgba(0,212,160,0.1)":"rgba(255,90,106,0.1)",border:`1px solid ${dirUp?teal:red}33`,color:dirUp?teal:red,fontSize:9,padding:"2px 8px",borderRadius:4,fontFamily:"'DM Mono',monospace"}}>
                                      {dirUp?"▲ ABOVE":"▼ BELOW"}
                                    </span>
                                  </td>
                                  <td style={{padding:"11px 16px",textAlign:"right",fontSize:12,fontWeight:700,color:"#eef0f8",fontFamily:"'DM Mono',monospace"}}>₹{fmt(a.targetPrice)}</td>
                                  <td style={{padding:"11px 16px",textAlign:"right",fontSize:12,color:cur>0?blue:"#3a4a6a",fontFamily:"'DM Mono',monospace"}}>{cur>0?`₹${fmt(cur)}`:"—"}</td>
                                  <td style={{padding:"11px 16px",textAlign:"right"}}>
                                    {hit?(
                                      <span style={{background:"rgba(0,212,160,0.1)",border:"1px solid rgba(0,212,160,0.3)",color:teal,fontSize:9,padding:"2px 8px",borderRadius:4,fontFamily:"'DM Mono',monospace"}}>✓ HIT</span>
                                    ):gap!==null?(
                                      <span style={{fontSize:11,color:amber,fontFamily:"'DM Mono',monospace"}}>{gap>=0?"+":""}{gap.toFixed(2)}%</span>
                                    ):"—"}
                                  </td>
                                  <td style={{padding:"11px 16px",textAlign:"right"}}>
                                    <button onClick={()=>removeAlert(a.companyId,a.direction)}
                                      style={{background:"rgba(255,90,106,0.08)",border:"1px solid rgba(255,90,106,0.2)",color:red,padding:"4px 10px",borderRadius:5,cursor:"pointer",fontSize:9,fontFamily:"'DM Mono',monospace"}}>
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
                <div style={{height:24}}/>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}