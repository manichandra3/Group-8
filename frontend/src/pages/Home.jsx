import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useExchange, TRADE_API } from "../hooks/useExchange";

// 8082 = stock-service (company/share metadata)
// 8083 = trade-service  (prices, candles, indicators, history, buy/sell)
const STOCK_API = axios.create({ baseURL: "http://localhost:8082/api" });

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
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE PRICE CHART (hover crosshair + tooltip)
// ─────────────────────────────────────────────────────────────────────────────
function InteractiveChart({ history = [], open, high, low, width = 700, height = 180 }) {
  const svgRef  = useRef(null);
  const [hover, setHover] = useState(null);

  if (history.length < 2) {
    return (
      <div style={{ width, height, display:"flex", alignItems:"center", justifyContent:"center", color:"#1a2540", fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>
        AWAITING DATA…
      </div>
    );
  }

  const PAD_L = 58, PAD_R = 14, PAD_T = 14, PAD_B = 28;
  const W = width  - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  const priceMin   = Math.min(...history) * 0.9985;
  const priceMax   = Math.max(...history) * 1.0015;
  const priceRange = priceMax - priceMin || 1;

  const px = (i) => PAD_L + (i / (history.length - 1)) * W;
  const py = (v) => PAD_T + H - ((v - priceMin) / priceRange) * H;

  const linePts  = history.map((v, i) => `${px(i)},${py(v)}`).join(" ");
  const areaPath = `M${px(0)},${py(history[0])} ` +
    history.map((v, i) => `L${px(i)},${py(v)}`).join(" ") +
    ` L${px(history.length-1)},${PAD_T+H} L${px(0)},${PAD_T+H} Z`;

  const isUp    = history[history.length-1] >= history[0];
  const upColor = isUp ? teal : red;

  const yTicks = Array.from({ length:5 }, (_, i) => ({
    v: priceMin + (priceRange * i) / 4,
    y: py(priceMin + (priceRange * i) / 4),
  }));

  const xStep  = Math.max(1, Math.floor(history.length / 6));
  const xTicks = history.map((_,i) => i).filter(i => i % xStep === 0 || i === history.length-1);
  const openY  = open > 0 ? py(Math.min(Math.max(open, priceMin), priceMax)) : null;
  const uid    = `ch${width}`;

  const handleMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    if (mx < PAD_L || mx > PAD_L + W) { setHover(null); return; }
    const idx     = Math.round(((mx - PAD_L) / W) * (history.length - 1));
    const clamped = Math.max(0, Math.min(history.length - 1, idx));
    const price   = history[clamped];
    const pct     = ((price - history[0]) / history[0]) * 100;
    setHover({ x: px(clamped), y: py(price), idx: clamped, price, pct });
  }, [history]);

  return (
    <div style={{ position:"relative", userSelect:"none" }}>
      <svg ref={svgRef} width={width} height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display:"block", cursor:"crosshair" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`${uid}f`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={upColor} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={upColor} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id={`${uid}l`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor={upColor} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={upColor} stopOpacity="1"/>
          </linearGradient>
          <clipPath id={`${uid}c`}>
            <rect x={PAD_L} y={PAD_T} width={W} height={H}/>
          </clipPath>
        </defs>

        {/* Grid */}
        {yTicks.map((t,i) => (
          <line key={i} x1={PAD_L} y1={t.y} x2={PAD_L+W} y2={t.y}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        ))}

        {/* Open line */}
        {openY && (
          <line x1={PAD_L} y1={openY} x2={PAD_L+W} y2={openY}
            stroke={amber} strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
        )}

        {/* Area + line */}
        <path d={areaPath} fill={`url(#${uid}f)`} clipPath={`url(#${uid}c)`}/>
        <polyline points={linePts} fill="none" stroke={`url(#${uid}l)`}
          strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"
          clipPath={`url(#${uid}c)`}/>

        {/* Y labels */}
        {yTicks.map((t,i) => (
          <text key={i} x={PAD_L-6} y={t.y+4} textAnchor="end" fontSize="8.5"
            fill="rgba(255,255,255,0.2)" fontFamily="'DM Mono',monospace">
            {fmt(t.v,0)}
          </text>
        ))}

        {/* Open label */}
        {openY && (
          <text x={PAD_L+W+3} y={openY+3.5} fontSize="8" fill={amber}
            fontFamily="'DM Mono',monospace" opacity="0.7">OPEN</text>
        )}

        {/* X labels */}
        {xTicks.map(i => (
          <text key={i} x={px(i)} y={PAD_T+H+18} textAnchor="middle" fontSize="8.5"
            fill="rgba(255,255,255,0.15)" fontFamily="'DM Mono',monospace">
            T-{history.length-1-i}s
          </text>
        ))}

        {/* Live dot */}
        {!hover && (
          <circle cx={px(history.length-1)} cy={py(history[history.length-1])}
            r="3.5" fill={upColor}
            style={{ filter:`drop-shadow(0 0 4px ${upColor})` }}/>
        )}

        {/* Crosshair */}
        {hover && (
          <>
            <line x1={hover.x} y1={PAD_T} x2={hover.x} y2={PAD_T+H}
              stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3"/>
            <line x1={PAD_L} y1={hover.y} x2={PAD_L+W} y2={hover.y}
              stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3,3"/>
            <rect x={2} y={hover.y-9} width={PAD_L-5} height={16}
              rx="3" fill="#0a1020" stroke={upColor} strokeWidth="0.8" opacity="0.9"/>
            <text x={PAD_L-8} y={hover.y+4} textAnchor="end" fontSize="8.5"
              fill={upColor} fontFamily="'DM Mono',monospace">
              {fmt(hover.price,2)}
            </text>
            <circle cx={hover.x} cy={hover.y} r="4" fill={upColor}
              style={{ filter:`drop-shadow(0 0 5px ${upColor})` }}/>
            <circle cx={hover.x} cy={hover.y} r="7" fill={upColor} opacity="0.15"/>
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hover && (() => {
        const hUp  = hover.pct >= 0;
        const c    = hUp ? teal : red;
        const flip = hover.x + PAD_L > width * 0.65;
        return (
          <div style={{ position:"absolute", top:Math.max(4,hover.y-52), left:flip?hover.x-148:hover.x+10, background:"#0a1525", border:`1px solid ${c}55`, borderRadius:8, padding:"9px 14px", pointerEvents:"none", zIndex:10, minWidth:130, boxShadow:"0 4px 24px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize:16, fontWeight:800, color:c, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:-0.5 }}>₹{fmt(hover.price)}</div>
            <div style={{ fontSize:10, color:hUp?teal:red, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{hUp?"▲ +":"▼ "}{hover.pct.toFixed(3)}%</div>
            <div style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace", marginTop:4, letterSpacing:1 }}>T-{history.length-1-hover.idx}s ago</div>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDLE CHART  (OHLC bars from /candles/{id})
// ─────────────────────────────────────────────────────────────────────────────
function CandleChart({ candles = [], width = 700, height = 160 }) {
  const [hover, setHover] = useState(null);
  if (!candles.length) return (
    <div style={{ width, height, display:"flex", alignItems:"center", justifyContent:"center", color:"#1a2540", fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>
      NO CANDLE DATA
    </div>
  );

  const PAD_L = 10, PAD_R = 10, PAD_T = 10, PAD_B = 24;
  const W = width  - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  const allPrices = candles.flatMap(c => [c.open, c.close, c.high, c.low]);
  const pMax = Math.max(...allPrices) * 1.002;
  const pMin = Math.min(...allPrices) * 0.998;
  const pRng = pMax - pMin || 1;
  const py   = (v) => PAD_T + H - ((v - pMin) / pRng) * H;

  const barW = Math.max(2, Math.floor((W / candles.length) * 0.7));
  const gap  = W / candles.length;

  return (
    <div style={{ position:"relative", userSelect:"none" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ display:"block" }}
        onMouseLeave={() => setHover(null)}>
        {candles.map((c, i) => {
          const cx      = PAD_L + i * gap + gap / 2;
          const isUp    = c.close >= c.open;
          const color   = isUp ? teal : red;
          const bodyTop = py(Math.max(c.open, c.close));
          const bodyBot = py(Math.min(c.open, c.close));
          const bodyH   = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={i} onMouseEnter={() => setHover({ c, cx, i })} style={{ cursor:"crosshair" }}>
              {/* Wick */}
              <line x1={cx} y1={py(c.high)} x2={cx} y2={py(c.low)}
                stroke={color} strokeWidth="1" opacity="0.6"/>
              {/* Body */}
              <rect x={cx - barW/2} y={bodyTop} width={barW} height={bodyH}
                fill={isUp ? `${color}30` : `${color}50`}
                stroke={color} strokeWidth="1" rx="1"/>
            </g>
          );
        })}

        {/* X axis time labels (every ~6th candle) */}
        {candles.filter((_,i) => i % Math.max(1, Math.floor(candles.length/6))===0).map((c,i) => {
          const idx = candles.indexOf(c);
          return (
            <text key={i} x={PAD_L + idx*gap + gap/2} y={PAD_T+H+18}
              textAnchor="middle" fontSize="8"
              fill="rgba(255,255,255,0.15)" fontFamily="'DM Mono',monospace">
              {fmtTime(c.startTime).slice(0,5)}
            </text>
          );
        })}
      </svg>

      {/* Candle tooltip */}
      {hover && (() => {
        const isUp = hover.c.close >= hover.c.open;
        const c    = isUp ? teal : red;
        const flip = hover.cx > width * 0.6;
        return (
          <div style={{ position:"absolute", top:8, left:flip ? hover.cx-180 : hover.cx+10, background:"#0a1525", border:`1px solid ${c}55`, borderRadius:8, padding:"10px 14px", pointerEvents:"none", zIndex:10, minWidth:160, boxShadow:"0 4px 20px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace", letterSpacing:2, marginBottom:6 }}>{fmtTime(hover.c.startTime)} · 1m</div>
            {[["O", hover.c.open, "#c8d4f0"], ["H", hover.c.high, teal], ["L", hover.c.low, red], ["C", hover.c.close, c]].map(([lbl, val, col]) => (
              <div key={lbl} style={{ display:"flex", justifyContent:"space-between", gap:16, marginBottom:2 }}>
                <span style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace" }}>{lbl}</span>
                <span style={{ fontSize:12, fontWeight:600, color:col, fontFamily:"'DM Mono',monospace" }}>₹{fmt(val)}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RSI CHART  (from /indicators/{id})
// ─────────────────────────────────────────────────────────────────────────────
function RsiGauge({ rsi }) {
  if (rsi === null || rsi === undefined) return null;
  const pct   = Math.min(Math.max(rsi, 0), 100);
  const color = rsi >= 70 ? red : rsi <= 30 ? teal : "#c8d4f0";
  const label = rsi >= 70 ? "OVERBOUGHT" : rsi <= 30 ? "OVERSOLD" : "NEUTRAL";
  const angle = (pct / 100) * 180 - 90; // -90 to +90 deg

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={120} height={66} viewBox="0 0 120 66">
        {/* Track */}
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round"/>
        {/* Zones */}
        <path d="M 10 60 A 50 50 0 0 1 35 17" fill="none" stroke={`${teal}44`} strokeWidth="8" strokeLinecap="round"/>
        <path d="M 85 17 A 50 50 0 0 1 110 60" fill="none" stroke={`${red}44`} strokeWidth="8" strokeLinecap="round"/>
        {/* Value arc */}
        <path d={`M 10 60 A 50 50 0 0 1 ${60 + 50*Math.cos((angle-90)*Math.PI/180)} ${60 + 50*Math.sin((angle-90)*Math.PI/180)}`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.9"/>
        {/* Needle */}
        <line x1="60" y1="60"
          x2={60 + 38*Math.cos((angle-90)*Math.PI/180)}
          y2={60 + 38*Math.sin((angle-90)*Math.PI/180)}
          stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="60" cy="60" r="4" fill={color}/>
        {/* Labels */}
        <text x="8"   y="76" fontSize="7" fill={`${teal}88`}  fontFamily="'DM Mono',monospace">30</text>
        <text x="100" y="76" fontSize="7" fill={`${red}88`}   fontFamily="'DM Mono',monospace">70</text>
      </svg>
      <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:20, fontWeight:800, color, letterSpacing:-0.5 }}>{rsi.toFixed(1)}</div>
      <div style={{ fontSize:9, color, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE HISTORY MINI-TABLE
// ─────────────────────────────────────────────────────────────────────────────
function PriceHistoryTable({ rows = [] }) {
  if (!rows.length) return (
    <div style={{ padding:"20px", textAlign:"center", color:"#1a2540", fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>NO HISTORY</div>
  );
  const last20 = [...rows].reverse().slice(0, 20);
  return (
    <div style={{ maxHeight:220, overflowY:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ borderBottom:"1px solid #0e1828", position:"sticky", top:0, background:"#060d1a" }}>
            {["Time","Price","Δ"].map(h => (
              <th key={h} style={{ padding:"7px 12px", fontSize:9, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", textAlign:h==="Price"||h==="Δ"?"right":"left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {last20.map((row, i) => {
            const prev  = last20[i+1];
            const delta = prev ? row.price - prev.price : 0;
            const up    = delta >= 0;
            return (
              <tr key={row.id || i} style={{ borderBottom:"1px solid rgba(255,255,255,0.02)" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"7px 12px", fontSize:10, color:"#3a4a6a", fontFamily:"'DM Mono',monospace" }}>{fmtTime(row.timestamp)}</td>
                <td style={{ padding:"7px 12px", fontSize:12, fontWeight:600, color:"#c8d4f0", fontFamily:"'DM Mono',monospace", textAlign:"right" }}>₹{fmt(row.price)}</td>
                <td style={{ padding:"7px 12px", fontSize:10, color:up?teal:red, fontFamily:"'DM Mono',monospace", textAlign:"right" }}>
                  {prev ? `${up?"+":""}${delta.toFixed(2)}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUY / SELL ORDER PANEL
// ─────────────────────────────────────────────────────────────────────────────
function OrderPanel({ company, livePrice }) {
  const [side,      setSide]      = useState("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [qty,       setQty]       = useState("1");
  const [limitPx,   setLimitPx]   = useState("");
  const [triggerPx, setTriggerPx] = useState("");
  const [status,    setStatus]    = useState(null); // { ok, msg }
  const [loading,   setLoading]   = useState(false);

  const userId = localStorage.getItem("userId") || 1; // fallback

  const submit = async () => {
    if (!qty || parseInt(qty) < 1) return;
    setLoading(true); setStatus(null);
    try {
      const body = {
        userId:       parseInt(userId),
        companyId:    company.id,
        quantity:     parseInt(qty),
        orderType,
        price:        limitPx   ? parseFloat(limitPx)   : undefined,
        triggerPrice: triggerPx ? parseFloat(triggerPx) : undefined,
      };
      const endpoint = side === "BUY" ? "/trade/buy" : "/trade/sell";
      const res = await TRADE_API.post(endpoint, body);
      setStatus({ ok:true, msg:`Order #${res.data.id} ${res.data.status} at ₹${fmt(res.data.price)}` });
      setQty("1"); setLimitPx(""); setTriggerPx("");
    } catch(e) {
      setStatus({ ok:false, msg: e.response?.data?.message || "Order failed" });
    } finally { setLoading(false); }
  };

  const isBuy = side === "BUY";
  const c     = isBuy ? teal : red;

  return (
    <div>
      {/* Side toggle */}
      <div style={{ display:"flex", gap:0, marginBottom:14, borderRadius:8, overflow:"hidden", border:"1px solid #0e1828" }}>
        {["BUY","SELL"].map(s => (
          <button key={s} onClick={() => setSide(s)} style={{ flex:1, padding:"10px", border:"none", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:2, fontWeight:700, cursor:"pointer", background: side===s ? (s==="BUY"?"rgba(0,212,160,0.18)":"rgba(255,90,106,0.18)") : "transparent", color: side===s ? (s==="BUY"?teal:red) : "#2a3550", transition:"all 0.15s" }}>{s}</button>
        ))}
      </div>

      {/* Order type */}
      <div style={{ display:"flex", gap:4, marginBottom:12 }}>
        {["MARKET","LIMIT","GTT"].map(t => (
          <button key={t} onClick={() => setOrderType(t)} style={{ flex:1, padding:"6px", border:`1px solid ${orderType===t?c+"55":"#0e1828"}`, borderRadius:6, background:orderType===t?`${c}12`:"transparent", color:orderType===t?c:"#2a3550", fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:1, cursor:"pointer", transition:"all 0.15s" }}>{t}</button>
        ))}
      </div>

      {/* Live price display */}
      <div style={{ background:"#060d1a", borderRadius:8, padding:"10px 14px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>MARKET PRICE</span>
        <span style={{ fontSize:16, fontWeight:800, color:c, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>₹{fmt(livePrice)}</span>
      </div>

      {/* Qty */}
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:9, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:5 }}>Quantity</label>
        <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
          style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:7, padding:"9px 12px", color:"#c8d4f0", fontFamily:"'DM Mono',monospace", fontSize:13, width:"100%", outline:"none" }}
          onFocus={e => e.target.style.borderColor=`${c}55`}
          onBlur={e  => e.target.style.borderColor="#0e1828"}/>
      </div>

      {/* Limit price */}
      {(orderType === "LIMIT" || orderType === "GTT") && (
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:9, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:5 }}>Limit Price (₹)</label>
          <input type="number" value={limitPx} onChange={e => setLimitPx(e.target.value)} placeholder={`e.g. ${fmt(livePrice,0)}`}
            style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:7, padding:"9px 12px", color:"#c8d4f0", fontFamily:"'DM Mono',monospace", fontSize:13, width:"100%", outline:"none" }}
            onFocus={e => e.target.style.borderColor=`${c}55`}
            onBlur={e  => e.target.style.borderColor="#0e1828"}/>
        </div>
      )}

      {/* Trigger price */}
      {orderType === "GTT" && (
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:9, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:5 }}>Trigger Price (₹)</label>
          <input type="number" value={triggerPx} onChange={e => setTriggerPx(e.target.value)} placeholder="Trigger at…"
            style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:7, padding:"9px 12px", color:"#c8d4f0", fontFamily:"'DM Mono',monospace", fontSize:13, width:"100%", outline:"none" }}
            onFocus={e => e.target.style.borderColor=`${c}55`}
            onBlur={e  => e.target.style.borderColor="#0e1828"}/>
        </div>
      )}

      {/* Estimated total */}
      {qty && parseInt(qty) > 0 && (
        <div style={{ background:"#060d1a", borderRadius:7, padding:"8px 12px", marginBottom:12, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>EST. TOTAL</span>
          <span style={{ fontSize:12, color:"#c8d4f0", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>
            ₹{fmt((parseFloat(limitPx || livePrice) * parseInt(qty || 0)))}
          </span>
        </div>
      )}

      {/* Submit */}
      <button onClick={submit} disabled={loading}
        style={{ width:"100%", padding:"13px", background:`${c}18`, border:`1px solid ${c}55`, color:c, borderRadius:10, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:15, cursor:loading?"wait":"pointer", transition:"all 0.2s", opacity:loading?0.7:1 }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background=`${c}28`; }}
        onMouseLeave={e => e.currentTarget.style.background=`${c}18`}>
        {loading ? "PLACING…" : `${isBuy?"▲ BUY":"▼ SELL"} ${qty || 0} × ${company.name}`}
      </button>

      {/* Status message */}
      {status && (
        <div style={{ marginTop:10, padding:"10px 14px", background:status.ok?"rgba(0,212,160,0.08)":"rgba(255,90,106,0.08)", border:`1px solid ${status.ok?teal:red}44`, borderRadius:8, fontSize:11, color:status.ok?teal:red, fontFamily:"'DM Mono',monospace", letterSpacing:0.5 }}>
          {status.ok ? "✓ " : "✕ "}{status.msg}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART INSIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function ChartInsights({ history = [], open, high, low, price, dayChangePct }) {
  if (history.length < 3) return null;
  const n      = history.length;
  const changes = history.slice(1).map((v,i) => ((v-history[i])/history[i])*100);
  const avgChg  = changes.reduce((a,b)=>a+b,0)/changes.length;
  const stdDev  = Math.sqrt(changes.reduce((a,b)=>a+(b-avgChg)**2,0)/changes.length);
  const rN      = Math.min(5, Math.floor(n/3));
  const momentum= (history.slice(-rN).reduce((a,b)=>a+b,0)/rN - history.slice(0,rN).reduce((a,b)=>a+b,0)/rN) / (history.slice(0,rN).reduce((a,b)=>a+b,0)/rN) * 100;
  const ups     = changes.filter(c=>c>0).length;
  const downs   = changes.filter(c=>c<0).length;
  const trendStr= Math.round((Math.max(ups,downs)/Math.max(changes.length,1))*100);
  const trendDir= ups>=downs?"BULLISH":"BEARISH";
  let signal = "NEUTRAL", sigColor = "#4a5a7a";
  if      (momentum>0.5 && stdDev<2)  { signal="TRENDING UP";    sigColor=teal; }
  else if (momentum<-0.5 && stdDev<2) { signal="TRENDING DOWN";  sigColor=red; }
  else if (stdDev>3)                   { signal="HIGH VOLATILITY";sigColor=amber; }
  else if (Math.abs(dayChangePct)>15)  { signal="NEAR CIRCUIT";  sigColor=amber; }

  const stats = [
    { label:"Volatility σ",  val:`${stdDev.toFixed(3)}%`,              color:stdDev>3?amber:stdDev>1.5?"#c8d4f0":teal },
    { label:"Momentum",      val:`${momentum>=0?"+":""}${momentum.toFixed(3)}%`, color:momentum>=0?teal:red },
    { label:"Trend",         val:`${trendStr}% ${trendDir}`,           color:trendDir==="BULLISH"?teal:red },
    { label:"Avg Tick Δ",    val:`${avgChg>=0?"+":""}${avgChg.toFixed(3)}%`,    color:avgChg>=0?teal:red },
    { label:"Circuit Left",  val:`${(20-Math.abs(dayChangePct)).toFixed(2)}%`,  color:(20-Math.abs(dayChangePct))<5?red:(20-Math.abs(dayChangePct))<10?amber:teal },
    { label:"Ticks",         val:`${n}`,                               color:"#c8d4f0" },
    { label:"Day High",      val:`₹${fmt(high)}`,                      color:teal },
    { label:"Day Low",       val:`₹${fmt(low)}`,                       color:red },
    { label:"vs Open",       val:`${price>=open?"+":""}${(((price-open)/open)*100).toFixed(3)}%`, color:price>=open?teal:red },
  ];

  return (
    <div style={{ padding:"16px 28px 0" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:3, height:14, background:blue, borderRadius:2 }}/>
        <span style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Chart Analytics</span>
        <div style={{ marginLeft:"auto", background:`${sigColor}18`, border:`1px solid ${sigColor}44`, color:sigColor, fontSize:9, padding:"3px 10px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>{signal}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:2 }}>
        {stats.map((s,i) => (
          <div key={s.label} style={{ padding:"9px 11px", background:i%2===0?"#060d1a":"rgba(255,255,255,0.01)", borderRadius:6 }}>
            <div style={{ fontSize:8, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:11, fontWeight:600, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:8, padding:"9px 12px", background:"#060d1a", borderRadius:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ fontSize:8, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Bull / Bear Balance</span>
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
function LiveSparkline({ history = [], width = 80, height = 32 }) {
  if (history.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...history), min = Math.min(...history);
  const up  = history[history.length-1] >= history[0];
  const c   = up ? teal : red;
  const pts = history.map((v,i) => {
    const x = (i/(history.length-1))*width;
    const y = height - ((v-min)/(max-min||1))*(height-6) - 3;
    return `${x},${y}`;
  }).join(" ");
  const last = pts.split(" ").pop().split(",");
  const area = `${pts} ${width},${height} 0,${height}`;
  const uid  = `sp${width}x${height}x${history[0]}x${history[history.length-1]}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:"block", flexShrink:0 }}>
      <defs>
        <linearGradient id={uid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={c} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={c} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon  points={area} fill={`url(#${uid})`}/>
      <polyline points={pts}  fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={c}/>
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

function LiveCompanyRow({ company, liveData, onClick }) {
  const { price, open, high, low, dayChangePct, tickChangePct, history } = liveData;
  const flash   = useFlash(price);
  const up      = dayChangePct >= 0;
  const color   = up ? teal : red;
  const flashBg = flash==="up"?"rgba(0,212,160,0.1)":flash==="down"?"rgba(255,90,106,0.1)":"transparent";
  return (
    <tr onClick={() => onClick(company, liveData)}
      style={{ background:flashBg, cursor:"pointer", transition:"background 0.4s" }}
      onMouseEnter={e => { if (!flash) e.currentTarget.style.background="rgba(0,184,255,0.03)"; }}
      onMouseLeave={e => { if (!flash) e.currentTarget.style.background="transparent"; }}>
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:`${color}15`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700, color, flexShrink:0 }}>
            {company.name.substring(0,3).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600, color:"#c8d4f0", letterSpacing:1 }}>{company.name}</div>
            <div style={{ fontSize:10, color:"#2a3550", marginTop:1 }}>ID #{company.id}</div>
          </div>
        </div>
      </td>
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, fontWeight:800, color:flash?(flash==="up"?teal:red):"#eef0f8", transition:"color 0.4s" }}>₹{fmt(price)}</div>
        <div style={{ fontSize:9, color:tickChangePct>=0?teal:red, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{tickChangePct>=0?"▲":"▼"} {Math.abs(tickChangePct).toFixed(2)}%</div>
      </td>
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
          <span style={{ color, fontSize:12, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{dayChangePct>=0?"+":""}{dayChangePct.toFixed(2)}%</span>
          <CircuitBadge dayPct={dayChangePct}/>
        </div>
      </td>
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ fontSize:12, color:"#6a7a9a", fontFamily:"'DM Mono',monospace" }}>₹{fmt(open)}</div>
      </td>
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ fontSize:12, color:teal, fontFamily:"'DM Mono',monospace" }}>₹{fmt(high)}</div>
      </td>
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ fontSize:12, color:red, fontFamily:"'DM Mono',monospace" }}>₹{fmt(low)}</div>
      </td>
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e" }}>
        <LiveSparkline history={history} width={64} height={26}/>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE DETAIL MODAL  — fully integrated with all 8083 endpoints
// ─────────────────────────────────────────────────────────────────────────────
function LiveDetailModal({ company, liveData: initialLiveData, liveMap, onClose }) {
  // Always read the freshest data from liveMap; fall back to the snapshot passed at open time
  const liveData = liveMap[company.id] ?? initialLiveData;
  const { price, open, high, low, dayChangePct, tickChangePct, history } = liveData;
  const up       = dayChangePct >= 0;
  const color    = up ? teal : red;
  const flash    = useFlash(price);
  const rangePos = Math.min(Math.max(((price-low)/((high-low)||1))*100, 2), 98);

  // ── Fetch from 8083 ────────────────────────────────────────────────────────
  const [candles,    setCandles]    = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [priceHist,  setPriceHist]  = useState([]);
  const [activeView, setActiveView] = useState("live"); // live | candle | history | trade

  const chartContainerRef = useRef(null);
  const [chartW, setChartW] = useState(760);

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setChartW(Math.floor(e.contentRect.width) - 16));
    if (chartContainerRef.current) obs.observe(chartContainerRef.current);
    return () => obs.disconnect();
  }, []);

  // Load all data when modal opens
  useEffect(() => {
    const id = company.id;
    // Candles
    TRADE_API.get(`/candles/${id}`)
      .then(r => setCandles(r.data))
      .catch(() => {});
    // Indicators
    TRADE_API.get(`/indicators/${id}`)
      .then(r => setIndicators(r.data))
      .catch(() => {});
    // Price history
    TRADE_API.get(`/price-history/${id}`)
      .then(r => setPriceHist(r.data))
      .catch(() => {});
  }, [company.id]);

  const views = [
    { id:"live",    label:"Live Chart" },
    { id:"candle",  label:"Candles" },
    { id:"history", label:"History" },
    { id:"trade",   label:"Trade" },
  ];

  return (
    <div onClick={e => { if (e.target===e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(4,8,18,0.93)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9000, backdropFilter:"blur(12px)", padding:"12px" }}>
      <div style={{ background:"#080f1e", border:`1px solid ${color}33`, borderTop:`2px solid ${color}`, borderRadius:20, width:"100%", maxWidth:920, maxHeight:"96vh", overflowY:"auto", position:"relative" }}>

        {/* Close */}
        <button onClick={onClose}
          style={{ position:"absolute", top:16, right:18, background:"rgba(255,255,255,0.04)", border:"1px solid #192030", color:"#4a5a7a", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 }}
          onMouseEnter={e => { e.currentTarget.style.color="#eef0f8"; e.currentTarget.style.borderColor="#3a4a6a"; }}
          onMouseLeave={e => { e.currentTarget.style.color="#4a5a7a"; e.currentTarget.style.borderColor="#192030"; }}>✕</button>

        {/* ── Header ── */}
        <div style={{ padding:"22px 28px 16px", borderBottom:"1px solid #0e1828" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                <div style={{ background:`${color}18`, border:`1px solid ${color}44`, color, padding:"5px 14px", borderRadius:6, fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, letterSpacing:2 }}>
                  {company.name.substring(0,4).toUpperCase()}
                </div>
                <span style={{ background:"rgba(0,212,160,0.1)", border:"1px solid rgba(0,212,160,0.3)", color:teal, fontSize:9, padding:"4px 10px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:2, display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:teal, display:"inline-block", animation:"pulseDot 1.5s infinite" }}/>
                  WS LIVE · 1S
                </span>
                <CircuitBadge dayPct={dayChangePct}/>
              </div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:600, color:"#6a7a9a" }}>
                {company.name} · NSE · ID #{company.id}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
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
            </div>
          </div>

          {/* Day range */}
          <div style={{ marginTop:14 }}>
            <div style={{ position:"relative", height:5, background:"rgba(255,255,255,0.05)", borderRadius:3 }}>
              <div style={{ position:"absolute", left:0, width:`${rangePos}%`, height:"100%", background:`linear-gradient(90deg,${red},${color})`, borderRadius:3, transition:"width 0.5s" }}/>
              <div style={{ position:"absolute", left:`${rangePos}%`, top:"50%", transform:"translate(-50%,-50%)", width:11, height:11, borderRadius:"50%", background:color, boxShadow:`0 0 7px ${color}`, border:"2px solid #080f1e", transition:"left 0.5s" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ fontSize:10, color:red,  fontFamily:"'DM Mono',monospace" }}>L ₹{fmt(low)}</span>
              <span style={{ fontSize:9,  color:"#2a3550", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>DAY RANGE</span>
              <span style={{ fontSize:10, color:teal, fontFamily:"'DM Mono',monospace" }}>H ₹{fmt(high)}</span>
            </div>
          </div>
        </div>

        {/* ── Indicators strip ── */}
        {indicators && (
          <div style={{ display:"flex", gap:2, padding:"10px 28px", background:"#060d1a", borderBottom:"1px solid #0e1828" }}>
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:14 }}>
              {/* MA badge */}
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>MA(5)</span>
                <span style={{ fontSize:13, fontWeight:700, color: price >= indicators.MovingAverage ? teal : red, fontFamily:"'DM Mono',monospace" }}>
                  ₹{fmt(indicators.MovingAverage)}
                </span>
                <span style={{ fontSize:9, color: price >= indicators.MovingAverage ? teal : red, fontFamily:"'DM Mono',monospace" }}>
                  {price >= indicators.MovingAverage ? "▲ ABOVE" : "▼ BELOW"}
                </span>
              </div>
              <div style={{ width:1, height:16, background:"#0e1828" }}/>
              {/* RSI badge */}
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>RSI(14)</span>
                <span style={{ fontSize:13, fontWeight:700, color: indicators.RSI >= 70 ? red : indicators.RSI <= 30 ? teal : "#c8d4f0", fontFamily:"'DM Mono',monospace" }}>
                  {indicators.RSI.toFixed(1)}
                </span>
                <span style={{ fontSize:9, color: indicators.RSI >= 70 ? red : indicators.RSI <= 30 ? teal : "#4a5a7a", fontFamily:"'DM Mono',monospace" }}>
                  {indicators.RSI >= 70 ? "OVERBOUGHT" : indicators.RSI <= 30 ? "OVERSOLD" : "NEUTRAL"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── View tabs ── */}
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #0e1828" }}>
          {views.map(v => (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              style={{ flex:1, padding:"11px", border:"none", borderBottom:`2px solid ${activeView===v.id?color:"transparent"}`, background:"transparent", color:activeView===v.id?color:"#2a3550", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", transition:"all 0.15s" }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* ── LIVE CHART VIEW ── */}
        {activeView === "live" && (
          <>
            <div ref={chartContainerRef} style={{ padding:"12px 8px 0", background:"#060d1a", borderBottom:"1px solid #0e1828" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 20px 8px" }}>
                <span style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Price Chart · Hover to inspect</span>
                <div style={{ display:"flex", gap:14 }}>
                  {[{dot:amber,label:"Open"},{dot:color,label:up?"Gain":"Loss"}].map(item=>(
                    <div key={item.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:8, height:2, background:item.dot, borderRadius:1 }}/>
                      <span style={{ fontSize:8, color:"#2a3550", fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <InteractiveChart history={history} open={open} high={high} low={low} width={chartW} height={180}/>
            </div>

            {/* Circuit bar */}
            <div style={{ margin:"12px 28px 0", background:"#060d1a", borderRadius:10, padding:"11px 16px", border:"1px solid #0e1828" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Daily Circuit Usage</span>
                <span style={{ fontSize:10, color:Math.abs(dayChangePct)>=15?amber:"#4a5a7a", fontFamily:"'DM Mono',monospace" }}>{Math.abs(dayChangePct).toFixed(2)}% / 20.00%</span>
              </div>
              <div style={{ height:5, background:"rgba(255,255,255,0.05)", borderRadius:3 }}>
                <div style={{ width:`${Math.min(Math.abs(dayChangePct)/20*100,100)}%`, height:"100%", background:`linear-gradient(90deg,${teal},${Math.abs(dayChangePct)>=15?amber:teal},${Math.abs(dayChangePct)>=19.5?red:teal})`, borderRadius:3, transition:"width 0.5s" }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                {[5,10,15,20].map(p=><span key={p} style={{ fontSize:8, color:"#1a2540", fontFamily:"'DM Mono',monospace" }}>{p}%</span>)}
              </div>
            </div>

            <ChartInsights history={history} open={open} high={high} low={low} price={price} dayChangePct={dayChangePct}/>

            {/* Stats */}
            <div style={{ padding:"14px 28px 0" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:2 }}>
                {[
                  { label:"Open",         val:`₹${fmt(open)}` },
                  { label:"Live Price",   val:`₹${fmt(price)}`,  hi:tickChangePct>0, lo:tickChangePct<0 },
                  { label:"Day High",     val:`₹${fmt(high)}`,   hi:true },
                  { label:"Day Low",      val:`₹${fmt(low)}`,    lo:true },
                  { label:"Day Change",   val:`${up?"+":""}${dayChangePct.toFixed(2)}%`, hi:up, lo:!up },
                  { label:"Tick Change",  val:`${tickChangePct>=0?"+":""}${tickChangePct.toFixed(2)}%`, hi:tickChangePct>0, lo:tickChangePct<0 },
                  { label:"Tick Limit",   val:"±5% / tick" },
                  { label:"Circuit",      val:"±20% / day" },
                  { label:"Data Points",  val:history.length },
                  { label:"Interval",     val:"1 second" },
                ].map((s,i)=>(
                  <div key={s.label} style={{ padding:"9px 11px", background:i%2===0?"#060d1a":"transparent", borderRadius:6 }}>
                    <div style={{ fontSize:8, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:3 }}>{s.label}</div>
                    <div style={{ fontSize:11, fontWeight:600, fontFamily:"'DM Mono',monospace", color:s.hi?teal:s.lo?red:"#c8d4f0" }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height:20 }}/>
          </>
        )}

        {/* ── CANDLE VIEW ── */}
        {activeView === "candle" && (
          <div style={{ padding:"16px 28px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ width:3, height:14, background:amber, borderRadius:2 }}/>
              <span style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>1-Minute OHLC Candles</span>
              <span style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace" }}>({candles.length} bars)</span>
            </div>
            <div style={{ background:"#060d1a", borderRadius:12, padding:"12px 8px 8px", border:"1px solid #0e1828" }}>
              <CandleChart candles={candles} width={chartW || 820} height={200}/>
            </div>

            {/* RSI gauge */}
            {indicators && (
              <div style={{ marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:12, padding:"18px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:6 }}>RSI (14)</span>
                  <RsiGauge rsi={indicators.RSI}/>
                </div>
                <div style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:12, padding:"18px 20px" }}>
                  <span style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:14 }}>Moving Average (5)</span>
                  <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:28, fontWeight:800, color: price >= indicators.MovingAverage ? teal : red, marginBottom:6 }}>
                    ₹{fmt(indicators.MovingAverage)}
                  </div>
                  <div style={{ fontSize:11, color: price >= indicators.MovingAverage ? teal : red, fontFamily:"'DM Mono',monospace" }}>
                    {price >= indicators.MovingAverage ? "▲ Price above MA — bullish signal" : "▼ Price below MA — bearish signal"}
                  </div>
                  <div style={{ marginTop:12, height:4, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                    <div style={{ width:`${Math.min(Math.abs((price-indicators.MovingAverage)/indicators.MovingAverage*100)*5,100)}%`, height:"100%", background: price >= indicators.MovingAverage ? teal : red, borderRadius:2 }}/>
                  </div>
                  <div style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace", marginTop:4 }}>
                    {((price-indicators.MovingAverage)/indicators.MovingAverage*100>=0?"+":"")}
                    {((price-indicators.MovingAverage)/indicators.MovingAverage*100).toFixed(3)}% from MA
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY VIEW ── */}
        {activeView === "history" && (
          <div style={{ padding:"16px 28px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ width:3, height:14, background:purple, borderRadius:2 }}/>
              <span style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Price History</span>
              <span style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace" }}>({priceHist.length} records · showing last 20)</span>
            </div>
            <div style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:12, overflow:"hidden" }}>
              <PriceHistoryTable rows={priceHist}/>
            </div>
          </div>
        )}

        {/* ── TRADE VIEW ── */}
        {activeView === "trade" && (
          <div style={{ padding:"16px 28px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:3, height:14, background:color, borderRadius:2 }}/>
              <span style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Place Order · {company.name}</span>
            </div>
            <div style={{ maxWidth:440 }}>
              <OrderPanel company={company} livePrice={price}/>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color: c, icon }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:hov?"#0e1828":"#0a1020", border:`1px solid ${hov?c+"33":"#0e1828"}`, borderRadius:14, padding:"20px 22px", position:"relative", overflow:"hidden", transition:"all 0.22s", boxShadow:hov?`0 8px 32px ${c}12`:"none" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:c, opacity:hov?1:0.3 }}/>
      <div style={{ position:"absolute", top:-16, right:-16, width:72, height:72, borderRadius:"50%", background:`radial-gradient(circle,${c}18 0%,transparent 70%)`, opacity:hov?1:0.5 }}/>
      <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>
      <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:28, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginTop:6 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:c, fontFamily:"'DM Mono',monospace", marginTop:5 }}>{sub}</div>}
    </div>
  );
}

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(4,8,18,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, backdropFilter:"blur(8px)" }}>
      <div style={{ background:"#080f1e", border:"1px solid #ff5a6a33", borderTop:"2px solid #ff5a6a", borderRadius:18, padding:"36px 44px", textAlign:"center", minWidth:300 }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚠</div>
        <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:"#eef0f8", marginBottom:8 }}>Sign Out</div>
        <div style={{ fontSize:11, color:"#2a3550", fontFamily:"'DM Mono',monospace", letterSpacing:1, marginBottom:26 }}>End your trading session?</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={onCancel}
            style={{ background:"transparent", border:"1px solid #0e1828", color:"#3a4a6a", padding:"9px 24px", borderRadius:8, fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, cursor:"pointer" }}
            onMouseEnter={e => { e.currentTarget.style.color="#c8d4f0"; e.currentTarget.style.borderColor="#3a4a6a"; }}
            onMouseLeave={e => { e.currentTarget.style.color="#3a4a6a"; e.currentTarget.style.borderColor="#0e1828"; }}>CANCEL</button>
          <button onClick={onConfirm}
            style={{ background:"rgba(255,90,106,0.12)", border:"1px solid rgba(255,90,106,0.35)", color:red, padding:"9px 24px", borderRadius:8, fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:2, cursor:"pointer" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,90,106,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,90,106,0.12)"}>SIGN OUT</button>
        </div>
      </div>
    </div>
  );
}

function BackBtn({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
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
  const [showLogout, setShowLogout] = useState(false);
  const scrollRef                   = useRef(null);

  const { liveMap, connected, tickCount } = useExchange();

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await STOCK_API.get("/companies");
      setCompanies(res.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [tab]);

  const defaultLive = (c) => ({
    companyId: c.id, companyName: c.name,
    price: c.lastPrice||0, open: c.openingPrice||c.lastPrice||0,
    high: c.dayHigh||c.lastPrice||0, low: c.dayLow||c.lastPrice||0,
    dayChangePct:0, tickChangePct:0, history:[c.lastPrice||0],
  });

  const gainers            = companies.filter(c => (liveMap[c.id]?.dayChangePct??0) >= 0).length;
  const nearCircuit        = companies.filter(c => Math.abs(liveMap[c.id]?.dayChangePct??0) >= 15).length;
  const filteredCompanies  = companies.filter(c => {
    const q      = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q);
    const dayPct = liveMap[c.id]?.dayChangePct ?? 0;
    const matchF = filter==="All"?true:filter==="Gainers"?dayPct>=0:filter==="Losers"?dayPct<0:filter==="Circuit"?Math.abs(dayPct)>=15:true;
    return matchQ && matchF;
  });
  const topGainers = [...companies].sort((a,b)=>(liveMap[b.id]?.dayChangePct??0)-(liveMap[a.id]?.dayChangePct??0)).slice(0,5);
  const topLosers  = [...companies].sort((a,b)=>(liveMap[a.id]?.dayChangePct??0)-(liveMap[b.id]?.dayChangePct??0)).slice(0,5);

  const NAV = [
    { id:"dashboard", icon:"◈", label:"Dashboard" },
    { id:"exchange",  icon:"◎", label:"Exchange"  },
  ];

  const TH = { padding:"10px 16px", fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontWeight:400, fontFamily:"'DM Mono',monospace", textAlign:"left" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { height:100%; }
        body { background:#04080e; overflow:hidden; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#0e1828; border-radius:4px; }
        ::placeholder { color:#1a2540 !important; }
        @keyframes pulseDot    { 0%,100%{opacity:1;box-shadow:0 0 5px ${teal};} 50%{opacity:0.3;box-shadow:none;} }
        @keyframes tickerScroll{ from{transform:translateX(0);} to{transform:translateX(-50%);} }
        @keyframes fadeUp      { from{opacity:0;transform:translateY(7px);} to{opacity:1;transform:translateY(0);} }
        @keyframes spin        { to{transform:rotate(360deg);} }
        @keyframes flashBadge  { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .fi { animation:fadeUp 0.28s ease both; }
      `}</style>

      {showLogout && <LogoutModal onConfirm={() => { setShowLogout(false); if (onLogout) onLogout(); }} onCancel={() => setShowLogout(false)}/>}
      {selected && (
        <LiveDetailModal
          company={selected.company}
          liveData={liveMap[selected.company.id] ?? selected.liveData}
          liveMap={liveMap}
          onClose={() => setSelected(null)}
        />
      )}

      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#04080e", fontFamily:"'DM Mono',monospace", color:"#c8d4f0" }}>

        {/* Navbar */}
        <div style={{ background:"#060d1a", borderBottom:"1px solid #0e1828", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", flexShrink:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#00b8ff,#00d4a0)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:"#04080e" }}>S</div>
            <div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:"#eef0f8", letterSpacing:-0.3, lineHeight:1 }}>ShareBazaar</div>
              <div style={{ fontSize:9, color:"#1a2540", letterSpacing:3 }}>LIVE EXCHANGE</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:2 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{ background:tab===n.id?"rgba(0,184,255,0.1)":"transparent", border:tab===n.id?"1px solid rgba(0,184,255,0.25)":"1px solid transparent", color:tab===n.id?blue:"#2a3550", padding:"7px 18px", borderRadius:8, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:2, textTransform:"uppercase", display:"flex", alignItems:"center", gap:8, transition:"all 0.15s" }}
                onMouseEnter={e => { if (tab!==n.id) { e.currentTarget.style.color="#6a7a9a"; e.currentTarget.style.background="rgba(255,255,255,0.02)"; } }}
                onMouseLeave={e => { if (tab!==n.id) { e.currentTarget.style.color="#2a3550"; e.currentTarget.style.background="transparent"; } }}>
                <span style={{ fontSize:13 }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:connected?teal:red, boxShadow:connected?`0 0 5px ${teal}`:"none", animation:connected?"pulseDot 1.5s infinite":"none" }}/>
              <span style={{ fontSize:9, color:connected?teal:red, letterSpacing:2 }}>{connected?"WS LIVE · 1S":"RECONNECTING…"}</span>
            </div>
            <div style={{ width:1, height:20, background:"#0e1828" }}/>
            <button onClick={fetchCompanies}
              style={{ background:"transparent", border:"1px solid #0e1828", color:"#2a3550", padding:"5px 12px", borderRadius:7, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:2, transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color=blue; e.currentTarget.style.borderColor=blue+"44"; }}
              onMouseLeave={e => { e.currentTarget.style.color="#2a3550"; e.currentTarget.style.borderColor="#0e1828"; }}>↻</button>
            <button onClick={() => setShowLogout(true)}
              style={{ background:"rgba(255,90,106,0.08)", border:"1px solid rgba(255,90,106,0.2)", color:red, padding:"5px 14px", borderRadius:7, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:2, textTransform:"uppercase", transition:"all 0.15s", display:"flex", alignItems:"center", gap:6 }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,90,106,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,90,106,0.08)"}>
              <span>⏻</span> Sign Out
            </button>
          </div>
        </div>

        {/* Ticker tape */}
        {companies.length > 0 && (
          <div style={{ overflow:"hidden", borderBottom:"1px solid #0e1828", background:"#060d1a", padding:"6px 0", flexShrink:0 }}>
            <div style={{ display:"inline-flex", gap:36, animation:"tickerScroll 35s linear infinite", whiteSpace:"nowrap" }}>
              {[...companies,...companies,...companies].map((c,i) => {
                const ld    = liveMap[c.id];
                const price = ld?.price ?? c.lastPrice ?? 0;
                const dayPct= ld?.dayChangePct ?? 0;
                const up    = dayPct >= 0;
                const col   = up ? teal : red;
                return (
                  <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:11, fontFamily:"'DM Mono',monospace" }}>
                    <span style={{ color:"#3a4a6a", letterSpacing:1 }}>{c.name.substring(0,5).toUpperCase()}</span>
                    <span style={{ color:"#c8d4f0" }}>₹{fmt(price)}</span>
                    <span style={{ color:col }}>{up?"▲":"▼"}{dayPct>=0?"+":""}{dayPct.toFixed(2)}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:14 }}>
            <div style={{ width:20, height:20, border:`2px solid #0e1828`, borderTopColor:blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
            <span style={{ fontSize:11, color:"#2a3550", letterSpacing:3 }}>LOADING MARKET DATA…</span>
          </div>
        ) : (
          <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:"auto", padding:"24px 28px 40px" }}>

            {/* DASHBOARD */}
            {tab === "dashboard" && (
              <div className="fi" style={{ display:"flex", flexDirection:"column", gap:22 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                  <div>
                    <div style={{ fontSize:9, color:"#1a2540", letterSpacing:4, textTransform:"uppercase", marginBottom:4 }}>Market Overview</div>
                    <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:26, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>Dashboard</h1>
                  </div>
                  <div style={{ fontSize:10, color:"#1a2540", letterSpacing:1 }}>
                    {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
                  <StatCard icon="⬡" label="Companies"    value={companies.length||"—"} color={blue}  sub="registered"/>
                  <StatCard icon="▲" label="Gainers"       value={gainers}               color={teal}  sub={`${companies.length-gainers} losers`}/>
                  <StatCard icon="▼" label="Losers"        value={companies.length-gainers} color={red} sub="today"/>
                  <StatCard icon="⚡" label="Near Circuit" value={nearCircuit}            color={amber} sub="≥15% move"/>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  {[["Top Gainers",topGainers,teal],["Top Losers",topLosers,red]].map(([title,list,c]) => (
                    <div key={title} style={{ background:"#0a1020", border:"1px solid #0e1828", borderRadius:14, overflow:"hidden" }}>
                      <div style={{ padding:"14px 18px", borderBottom:"1px solid #0e1828", display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:3, height:16, background:c, borderRadius:2 }}/>
                        <span style={{ fontSize:11, color:"#6a7a9a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{title}</span>
                      </div>
                      {list.map(company => {
                        const ld     = liveMap[company.id] ?? defaultLive(company);
                        const dayPct = ld.dayChangePct;
                        const up     = dayPct >= 0;
                        return (
                          <div key={company.id} onClick={() => setSelected({ company, liveData:ld })}
                            style={{ padding:"11px 18px", borderBottom:"1px solid #060d1a", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", transition:"background 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ background:`${c}15`, border:`1px solid ${c}30`, color:c, padding:"2px 8px", borderRadius:4, fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>
                                {company.name.substring(0,5).toUpperCase()}
                              </div>
                              <span style={{ fontSize:12, color:"#eef0f8", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>₹{fmt(ld.price)}</span>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <LiveSparkline history={ld.history} width={40} height={18}/>
                              <span style={{ fontSize:12, color:up?teal:red, fontFamily:"'DM Mono',monospace", fontWeight:600, minWidth:65, textAlign:"right" }}>
                                {up?"+":""}{dayPct.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <div style={{ width:3, height:20, background:blue, borderRadius:2, boxShadow:`0 0 8px ${blue}88` }}/>
                    <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:16, color:"#eef0f8" }}>All Companies</span>
                    <button onClick={() => setTab("exchange")}
                      style={{ marginLeft:"auto", background:"transparent", border:"1px solid #0e1828", color:"#2a3550", padding:"4px 12px", borderRadius:6, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:2, transition:"all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color=blue; e.currentTarget.style.borderColor=blue+"44"; }}
                      onMouseLeave={e => { e.currentTarget.style.color="#2a3550"; e.currentTarget.style.borderColor="#0e1828"; }}>LIVE EXCHANGE →</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                    {companies.map((c,i) => {
                      const ld    = liveMap[c.id] ?? defaultLive(c);
                      const up    = ld.dayChangePct >= 0;
                      const color = up ? teal : red;
                      const ac    = i%4===0?blue:i%4===1?teal:i%4===2?amber:purple;
                      return (
                        <div key={c.id} onClick={() => setSelected({ company:c, liveData:ld })} className="fi"
                          style={{ animationDelay:`${Math.min(i*35,350)}ms`, background:"#0a1020", border:`1px solid ${color}22`, borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"all 0.2s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor=`${color}55`; e.currentTarget.style.background="#0e1828"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor=`${color}22`; e.currentTarget.style.background="#0a1020"; }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                            <div style={{ width:36, height:36, borderRadius:8, background:`${ac}15`, border:`1px solid ${ac}30`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:13, color:ac }}>
                              {c.name.substring(0,2).toUpperCase()}
                            </div>
                            <LiveSparkline history={ld.history} width={50} height={22}/>
                          </div>
                          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13, color:"#c8d4f0", marginBottom:4 }}>{c.name}</div>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:17, color:"#eef0f8" }}>₹{fmt(ld.price)}</div>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                              <span style={{ fontSize:11, color, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{up?"+":""}{ld.dayChangePct.toFixed(2)}%</span>
                              <CircuitBadge dayPct={ld.dayChangePct}/>
                            </div>
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
                    <BackBtn onClick={() => setTab("dashboard")}/>
                    <div>
                      <div style={{ fontSize:9, color:"#1a2540", letterSpacing:4, textTransform:"uppercase", marginBottom:2 }}>Live Market · port 8083</div>
                      <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:24, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>Exchange</h1>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:connected?teal:red, animation:connected?"pulseDot 1.5s infinite":"none" }}/>
                    <span style={{ fontSize:9, color:connected?teal:red, letterSpacing:2 }}>{connected?"BACKEND WS · 1S TICKS":"RECONNECTING"}</span>
                  </div>
                </div>

                <div style={{ background:"#0a1020", border:"1px solid #0e1828", borderRadius:10, padding:"12px 18px", display:"flex", gap:24, flexWrap:"wrap" }}>
                  {[
                    { label:"Tick dev",    val:"±5% max",          color:blue },
                    { label:"Circuit",     val:"±20% hard cap",    color:amber },
                    { label:"Interval",    val:"1 second",          color:teal },
                    { label:"Transport",   val:"WS / STOMP",        color:purple },
                    { label:"Port",        val:"8083",              color:"#6a7a9a" },
                  ].map(it => (
                    <div key={it.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:it.color }}/>
                      <span style={{ fontSize:9, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{it.label}</span>
                      <span style={{ fontSize:11, color:it.color, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{it.val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <div style={{ position:"relative", flex:1, minWidth:220 }}>
                    <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"#1a2540", fontSize:14 }}>⌕</span>
                    <input placeholder="Search company…" value={search} onChange={e => setSearch(e.target.value)}
                      style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:8, padding:"9px 12px 9px 32px", color:"#c8d4f0", fontFamily:"'DM Mono',monospace", fontSize:12, outline:"none", width:"100%", transition:"border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor="#1e3a5a"}
                      onBlur={e  => e.target.style.borderColor="#0e1828"}/>
                  </div>
                  {["All","Gainers","Losers","Circuit"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ background:filter===f?"rgba(0,184,255,0.1)":"transparent", border:`1px solid ${filter===f?"rgba(0,184,255,0.3)":"#0e1828"}`, color:filter===f?blue:"#2a3550", padding:"8px 14px", borderRadius:7, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1, textTransform:"uppercase", transition:"all 0.15s" }}>{f}</button>
                  ))}
                </div>

                <div style={{ background:"#0a1020", border:"1px solid #0e1828", borderRadius:14, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #0e1828", background:"#060d1a" }}>
                        {["Company","Live Price","Day Chg","Open","High","Low","Trend"].map(h => (
                          <th key={h} style={{ ...TH, textAlign:["Live Price","Day Chg","Open","High","Low"].includes(h)?"right":"left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map(company => (
                        <LiveCompanyRow
                          key={company.id}
                          company={company}
                          liveData={liveMap[company.id] ?? defaultLive(company)}
                          onClick={(c, ld) => setSelected({ company:c, liveData:ld })}
                        />
                      ))}
                    </tbody>
                  </table>
                  {filteredCompanies.length === 0 && (
                    <div style={{ textAlign:"center", padding:48, color:"#1a2540", fontSize:11, letterSpacing:2 }}>NO COMPANIES MATCH</div>
                  )}
                </div>
                {filteredCompanies.length > 0 && (
                  <div style={{ textAlign:"center", fontSize:10, color:"#1a2540", letterSpacing:2 }}>
                    {filteredCompanies.length} COMPANIES · PORT 8083 · 1S WS TICKS
                  </div>
                )}
                <div style={{ height:24 }}/>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}