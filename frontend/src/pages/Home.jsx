import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useExchange } from "../hooks/useExchange";

const API = axios.create({ baseURL: "http://localhost:8082/api" });

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const teal  = "#00d4a0";
const red   = "#ff5a6a";
const blue  = "#00b8ff";
const amber = "#fbbf24";

function fmt(n, d = 2) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCap(n) {
  if (n >= 1e9) return `₹${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `₹${(n / 1e6).toFixed(2)}M`;
  return `₹${n.toLocaleString()}`;
}
function fmtVol(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE SPARKLINE
// ─────────────────────────────────────────────────────────────────────────────
function LiveSparkline({ history = [], width = 80, height = 32 }) {
  if (history.length < 2) return <div style={{ width, height }} />;
  const max   = Math.max(...history);
  const min   = Math.min(...history);
  const up    = history[history.length - 1] >= history[0];
  const color = up ? teal : red;
  const pts   = history.map((v, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((v - min) / (max - min || 1)) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  const last = pts.split(" ").pop().split(",");
  const area = `${pts} ${width},${height} 0,${height}`;
  const uid  = `ls${width}${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:"block", flexShrink:0 }}>
      <defs>
        <linearGradient id={uid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon  points={area} fill={`url(#${uid})`} />
      <polyline points={pts}  fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE FLASH HOOK
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// CIRCUIT BADGE
// ─────────────────────────────────────────────────────────────────────────────
function CircuitBadge({ dayPct }) {
  const abs = Math.abs(dayPct);
  if (abs >= 19.5) return (
    <span style={{ background:"rgba(255,90,106,0.2)", border:"1px solid #ff5a6a66", color:red, fontSize:9, padding:"2px 7px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:1, animation:"flashBadge 0.8s infinite" }}>
      ⚠ CIRCUIT
    </span>
  );
  if (abs >= 15) return (
    <span style={{ background:"rgba(251,191,36,0.15)", border:"1px solid #fbbf2466", color:amber, fontSize:9, padding:"2px 7px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>
      ⚡ LIMIT
    </span>
  );
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE SHARE ROW
// ─────────────────────────────────────────────────────────────────────────────
function LiveShareRow({ share, liveData, onClick }) {
  const { price, open, high, low, dayChangePct, tickChangePct, history } = liveData;
  const flash    = useFlash(price);
  const up       = dayChangePct >= 0;
  const color    = up ? teal : red;
  const tickUp   = tickChangePct >= 0;
  const cap      = price * share.totalShares;
  const floatPct = ((share.availableShares / share.totalShares) * 100).toFixed(1);
  const flashBg  = flash === "up" ? "rgba(0,212,160,0.1)" : flash === "down" ? "rgba(255,90,106,0.1)" : "transparent";

  return (
    <tr onClick={() => onClick(share, liveData)}
      style={{ background:flashBg, cursor:"pointer", transition:"background 0.4s" }}
      onMouseEnter={e => { if (!flash) e.currentTarget.style.background="rgba(0,184,255,0.03)"; }}
      onMouseLeave={e => { if (!flash) e.currentTarget.style.background="transparent"; }}>

      {/* Symbol */}
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:7, background:`${color}15`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, color, flexShrink:0 }}>
            {(share.companySymbol || `S${share.id}`).substring(0, 3)}
          </div>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600, color:"#c8d4f0", letterSpacing:1 }}>{share.companySymbol || `SH${share.id}`}</div>
            <div style={{ fontSize:10, color:"#2a3550", marginTop:1 }}>ID #{share.id}</div>
          </div>
        </div>
      </td>

      {/* Live Price */}
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, fontWeight:800, color: flash ? (flash==="up"?teal:red) : "#eef0f8", transition:"color 0.4s" }}>
          ₹{fmt(price)}
        </div>
        <div style={{ fontSize:9, color:tickUp?teal:red, fontFamily:"'DM Mono',monospace", marginTop:2 }}>
          {tickUp ? "▲" : "▼"} {Math.abs(tickChangePct).toFixed(2)}%
        </div>
      </td>

      {/* Day Change */}
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
          <span style={{ color, fontSize:12, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>
            {dayChangePct >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}%
          </span>
          <CircuitBadge dayPct={dayChangePct} />
        </div>
      </td>

      {/* Open */}
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ fontSize:12, color:"#6a7a9a", fontFamily:"'DM Mono',monospace" }}>₹{fmt(open)}</div>
      </td>

      {/* High */}
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ fontSize:12, color:teal, fontFamily:"'DM Mono',monospace" }}>₹{fmt(high)}</div>
      </td>

      {/* Low */}
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", textAlign:"right" }}>
        <div style={{ fontSize:12, color:red, fontFamily:"'DM Mono',monospace" }}>₹{fmt(low)}</div>
      </td>

      {/* Float */}
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e", width:110 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ flex:1, height:3, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
            <div style={{ width:`${floatPct}%`, height:"100%", background:`linear-gradient(90deg,${color},${color}55)`, borderRadius:2 }} />
          </div>
          <span style={{ fontSize:9, color:"#2a3550", fontFamily:"'DM Mono',monospace", minWidth:28 }}>{floatPct}%</span>
        </div>
      </td>

      {/* Sparkline */}
      <td style={{ padding:"12px 16px", borderBottom:"1px solid #090f1e" }}>
        <LiveSparkline history={history} width={64} height={26} />
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function LiveDetailModal({ share, liveData, onClose }) {
  const { price, open, high, low, dayChangePct, tickChangePct, history } = liveData;
  const up       = dayChangePct >= 0;
  const color    = up ? teal : red;
  const flash    = useFlash(price);
  const rangePos = Math.min(Math.max(((price - low) / ((high - low) || 1)) * 100, 2), 98);
  const cap      = price * share.totalShares;
  const floatPct = ((share.availableShares / share.totalShares) * 100).toFixed(1);

  const stats = [
    { label:"Open",          val:`₹${fmt(open)}` },
    { label:"Live Price",    val:`₹${fmt(price)}`,             hi: tickChangePct>0, lo: tickChangePct<0 },
    { label:"Day High",      val:`₹${fmt(high)}`,              hi:true },
    { label:"Day Low",       val:`₹${fmt(low)}`,               lo:true },
    { label:"Day Change",    val:`${up?"+":""}${dayChangePct.toFixed(2)}%`, hi:up, lo:!up },
    { label:"Tick Change",   val:`${tickChangePct>=0?"+":""}${tickChangePct.toFixed(2)}%`, hi:tickChangePct>0, lo:tickChangePct<0 },
    { label:"Market Cap",    val:fmtCap(cap) },
    { label:"Total Shares",  val:Number(share.totalShares).toLocaleString() },
    { label:"Available",     val:Number(share.availableShares).toLocaleString() },
    { label:"Free Float",    val:`${floatPct}%` },
    { label:"Tick Limit",    val:"±5% / tick" },
    { label:"Daily Circuit", val:"±20% / day" },
    { label:"Data Points",   val:history.length },
    { label:"P/E Ratio",     val:(15 + share.id % 10).toFixed(1) },
    { label:"Face Value",    val:`₹${price > 100 ? 10 : 1}` },
    { label:"Circuit",       val:"±10% hard" },
  ];

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(4,8,18,0.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9000, backdropFilter:"blur(10px)", padding:20 }}>
      <div style={{ background:"#080f1e", border:`1px solid ${color}33`, borderTop:`2px solid ${color}`, borderRadius:20, width:"100%", maxWidth:800, maxHeight:"92vh", overflowY:"auto", position:"relative" }}>

        {/* Close */}
        <button onClick={onClose}
          style={{ position:"absolute", top:16, right:18, background:"rgba(255,255,255,0.04)", border:"1px solid #192030", color:"#4a5a7a", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e => { e.currentTarget.style.color="#eef0f8"; e.currentTarget.style.borderColor="#3a4a6a"; }}
          onMouseLeave={e => { e.currentTarget.style.color="#4a5a7a"; e.currentTarget.style.borderColor="#192030"; }}>✕</button>

        {/* Header */}
        <div style={{ padding:"26px 28px 20px", borderBottom:"1px solid #0e1828" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <div style={{ background:`${color}18`, border:`1px solid ${color}44`, color, padding:"5px 14px", borderRadius:6, fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, letterSpacing:2 }}>
                  {share.companySymbol || `SH${share.id}`}
                </div>
                <span style={{ background:"rgba(0,212,160,0.1)", border:"1px solid rgba(0,212,160,0.3)", color:teal, fontSize:9, padding:"4px 10px", borderRadius:4, fontFamily:"'DM Mono',monospace", letterSpacing:2, display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:teal, display:"inline-block", animation:"pulseDot 1.5s infinite" }}/>
                  WS LIVE
                </span>
                <CircuitBadge dayPct={dayChangePct} />
              </div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:600, color:"#6a7a9a" }}>
                {share.companyName || `Company ID: ${share.companyId}`} · NSE · EQ
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:38, fontWeight:800, letterSpacing:-1, lineHeight:1, color: flash ? (flash==="up"?teal:red) : "#eef0f8", transition:"color 0.4s" }}>
                ₹{fmt(price)}
              </div>
              <div style={{ marginTop:6, display:"flex", justifyContent:"flex-end", gap:8 }}>
                <span style={{ background:`${color}18`, border:`1px solid ${color}33`, color, padding:"4px 12px", borderRadius:20, fontSize:12, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>
                  {up ? "+" : ""}{dayChangePct.toFixed(2)}% day
                </span>
                <span style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #192030", color:"#3a4a6a", padding:"4px 10px", borderRadius:20, fontSize:11, fontFamily:"'DM Mono',monospace" }}>
                  {tickChangePct >= 0 ? "+" : ""}{tickChangePct.toFixed(2)}% tick
                </span>
              </div>
            </div>
          </div>

          {/* Day range bar */}
          <div style={{ marginTop:18 }}>
            <div style={{ position:"relative", height:6, background:"rgba(255,255,255,0.05)", borderRadius:3 }}>
              <div style={{ position:"absolute", left:0, width:`${rangePos}%`, height:"100%", background:`linear-gradient(90deg,${red},${color})`, borderRadius:3, transition:"width 0.5s" }} />
              <div style={{ position:"absolute", left:`${rangePos}%`, top:"50%", transform:"translate(-50%,-50%)", width:12, height:12, borderRadius:"50%", background:color, boxShadow:`0 0 8px ${color}`, border:"2px solid #080f1e", transition:"left 0.5s" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
              <span style={{ fontSize:10, color:red,  fontFamily:"'DM Mono',monospace" }}>L ₹{fmt(low)}</span>
              <span style={{ fontSize:9,  color:"#2a3550", fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>DAY RANGE</span>
              <span style={{ fontSize:10, color:teal, fontFamily:"'DM Mono',monospace" }}>H ₹{fmt(high)}</span>
            </div>
          </div>

          {/* Circuit usage bar */}
          <div style={{ marginTop:14, background:"#060d1a", borderRadius:10, padding:"12px 16px", border:"1px solid #0e1828" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
              <span style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>Daily Circuit Usage</span>
              <span style={{ fontSize:10, color: Math.abs(dayChangePct)>=15 ? amber : "#4a5a7a", fontFamily:"'DM Mono',monospace" }}>
                {Math.abs(dayChangePct).toFixed(2)}% / 20.00%
              </span>
            </div>
            <div style={{ height:5, background:"rgba(255,255,255,0.05)", borderRadius:3 }}>
              <div style={{ width:`${Math.min(Math.abs(dayChangePct)/20*100,100)}%`, height:"100%", background:`linear-gradient(90deg,${teal},${Math.abs(dayChangePct)>=15?amber:teal},${Math.abs(dayChangePct)>=19.5?red:teal})`, borderRadius:3, transition:"width 0.5s" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              {[5,10,15,20].map(p => (
                <span key={p} style={{ fontSize:8, color:"#1a2540", fontFamily:"'DM Mono',monospace" }}>{p}%</span>
              ))}
            </div>
          </div>

          {/* Big sparkline */}
          <div style={{ marginTop:14, background:"#060d1a", borderRadius:10, padding:"10px 8px 6px", border:"1px solid #0e1828" }}>
            <LiveSparkline history={history} width={732} height={100} />
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ padding:"20px 28px 28px" }}>
          <div style={{ fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:12 }}>Live Market Statistics</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:2 }}>
            {stats.map((s, i) => (
              <div key={s.label} style={{ padding:"11px 13px", background:i%2===0?"#060d1a":"transparent", borderRadius:6 }}>
                <div style={{ fontSize:9, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:13, fontWeight:600, fontFamily:"'DM Mono',monospace", color:s.hi?teal:s.lo?red:"#c8d4f0" }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, marginTop:22 }}>
            {[["▲ BUY","rgba(0,212,160,0.12)","rgba(0,212,160,0.35)",teal],["▼ SELL","rgba(255,90,106,0.12)","rgba(255,90,106,0.35)",red]].map(([lbl,bg,bc,c]) => (
              <button key={lbl}
                style={{ flex:1, background:bg, border:`1px solid ${bc}`, color:c, padding:13, borderRadius:10, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer", transition:"all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background=bg.replace("0.12","0.22")}
                onMouseLeave={e => e.currentTarget.style.background=bg}>{lbl}</button>
            ))}
            <button style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #192030", color:"#4a5a7a", padding:"13px 20px", borderRadius:10, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:13, cursor:"pointer", transition:"all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.color="#c8d4f0"; e.currentTarget.style.borderColor="#3a4a6a"; }}
              onMouseLeave={e => { e.currentTarget.style.color="#4a5a7a"; e.currentTarget.style.borderColor="#192030"; }}>☆ Watch</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY CARD
// ─────────────────────────────────────────────────────────────────────────────
function CompanyCard({ company, shares, liveMap, onShareClick }) {
  const [expanded, setExpanded] = useState(false);
  const compShares  = shares.filter(s => s.companyId === company.id);
  const totalCap    = compShares.reduce((a,s) => a + (liveMap[s.id]?.price || s.pricePerShare)*s.totalShares, 0);
  const gainers     = compShares.filter(s => (liveMap[s.id]?.dayChangePct || 0) >= 0).length;
  const accentColor = company.sector==="IT"?blue:company.sector==="Finance"?teal:company.sector==="Energy"?amber:"#a78bfa";

  return (
    <div style={{ background:"#0a1020", border:"1px solid #0e1828", borderRadius:14, overflow:"hidden" }}>
      <div onClick={() => setExpanded(e => !e)}
        style={{ padding:"18px 20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:expanded?"1px solid #0e1828":"none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:`${accentColor}15`, border:`1px solid ${accentColor}30`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:15, color:accentColor, flexShrink:0 }}>
            {company.name.substring(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:15, color:"#eef0f8", marginBottom:3 }}>{company.name}</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ background:`${accentColor}18`, border:`1px solid ${accentColor}33`, color:accentColor, padding:"2px 8px", borderRadius:4, fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>{company.sector||"—"}</span>
              <span style={{ fontSize:10, color:"#2a3550", fontFamily:"'DM Mono',monospace" }}>{compShares.length} listing{compShares.length!==1?"s":""}</span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:3 }}>Live Cap</div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:16, color:"#c8d4f0" }}>{fmtCap(totalCap)}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace", marginBottom:3 }}>Gainers</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:16, color:gainers>0?teal:"#2a3550" }}>{gainers}/{compShares.length}</div>
          </div>
          <span style={{ color:"#2a3550", fontSize:16, display:"inline-block", transform:expanded?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }}>▾</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding:"12px 16px 16px" }}>
          {compShares.length > 0 ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
              {compShares.map(share => {
                const ld     = liveMap[share.id];
                const price  = ld ? ld.price : share.pricePerShare;
                const dayPct = ld ? ld.dayChangePct : 0;
                const hist   = ld ? ld.history : [share.pricePerShare];
                const up     = dayPct >= 0;
                const c      = up ? teal : red;
                return (
                  <div key={share.id} onClick={() => onShareClick(share, ld)}
                    style={{ background:"#060d1a", border:`1px solid ${c}22`, borderRadius:10, padding:"14px 16px", cursor:"pointer", transition:"all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor=`${c}55`}
                    onMouseLeave={e => e.currentTarget.style.borderColor=`${c}22`}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:700, color:c, letterSpacing:1, marginBottom:3 }}>{share.companySymbol||`SH${share.id}`}</div>
                        <div style={{ fontSize:10, color:"#2a3550" }}>ID #{share.id}</div>
                      </div>
                      <LiveSparkline history={hist} width={54} height={24}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                      <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:18, color:"#eef0f8" }}>₹{fmt(price)}</span>
                      <span style={{ fontSize:11, color:c, fontFamily:"'DM Mono',monospace" }}>{up?"+":""}{dayPct.toFixed(2)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:20, color:"#1a2540", fontSize:12, fontFamily:"'DM Mono',monospace" }}>No shares listed</div>
          )}
        </div>
      )}
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

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT MODAL
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// BACK BUTTON
// ─────────────────────────────────────────────────────────────────────────────
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
  const [tab, setTab]             = useState("dashboard");
  const [shares, setShares]       = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("All");
  const [loading, setLoading]     = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const scrollRef = useRef(null);

  // ── Real WebSocket price feed ──────────────────────────────────────────────
  const { liveMap, connected, tickCount } = useExchange();

  // ── Fetch share / company metadata ────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, cRes] = await Promise.allSettled([
        API.get("/shares"),
        API.get("/companies"),
      ]);
      if (sRes.status === "fulfilled") setShares(sRes.value.data);
      if (cRes.status === "fulfilled") setCompanies(cRes.value.data);
      setLastUpdated(new Date());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [tab]);

  // ── Derived values (recalculated on every tick via tickCount) ─────────────
  const gainers  = shares.filter(s => (liveMap[s.id]?.dayChangePct ?? 0) >= 0).length;
  const totalCap = shares.reduce((a,s) => a + (liveMap[s.id]?.price ?? s.pricePerShare)*s.totalShares, 0);
  const avgPrice = shares.length ? shares.reduce((a,s) => a + (liveMap[s.id]?.price ?? s.pricePerShare), 0) / shares.length : 0;

  const filteredShares = shares.filter(s => {
    const q      = search.toLowerCase();
    const sym    = (s.companySymbol || `SH${s.id}`).toLowerCase();
    const name   = (s.companyName   || "").toLowerCase();
    const matchQ = !q || sym.includes(q) || name.includes(q);
    const ld     = liveMap[s.id];
    const dayPct = ld ? ld.dayChangePct : 0;
    const fp     = (s.availableShares / s.totalShares) * 100;
    const matchF = filter==="All"        ? true
                 : filter==="Gainers"    ? dayPct >= 0
                 : filter==="Losers"     ? dayPct <  0
                 : filter==="High Float" ? fp > 70
                 : filter==="Circuit"    ? Math.abs(dayPct) >= 15
                 : true;
    return matchQ && matchF;
  });

  const NAV = [
    { id:"dashboard", icon:"◈", label:"Dashboard" },
    { id:"companies", icon:"⬡", label:"Companies" },
    { id:"shares",    icon:"◎", label:"Exchange" },
  ];

  const TH = { padding:"10px 16px", fontSize:9, color:"#2a3550", letterSpacing:3, textTransform:"uppercase", fontWeight:400, fontFamily:"'DM Mono',monospace", textAlign:"left" };

  const defaultLive = (s) => ({
    price: s.pricePerShare, open: s.pricePerShare,
    high: s.pricePerShare, low: s.pricePerShare,
    dayChangePct: 0, tickChangePct: 0, history: [s.pricePerShare],
  });

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

      {showLogout && <LogoutModal onConfirm={() => { setShowLogout(false); if (onLogout) onLogout(); }} onCancel={() => setShowLogout(false)} />}
      {selected && (
        <LiveDetailModal
          share={selected.share}
          liveData={liveMap[selected.share.id] ?? selected.liveData}
          onClose={() => setSelected(null)}
        />
      )}

      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#04080e", fontFamily:"'DM Mono',monospace", color:"#c8d4f0" }}>

        {/* ── Navbar ── */}
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
            {/* WS connection status */}
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:connected?teal:"#ff5a6a", boxShadow:connected?`0 0 5px ${teal}`:"none", animation:connected?"pulseDot 1.5s infinite":"none" }}/>
              <span style={{ fontSize:9, color:connected?teal:"#ff5a6a", letterSpacing:2 }}>{connected ? "WS LIVE" : "RECONNECTING"}</span>
            </div>
            <div style={{ width:1, height:20, background:"#0e1828" }}/>
            {lastUpdated && <span style={{ fontSize:9, color:"#1a2540" }}>{lastUpdated.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>}
            <button onClick={fetchData}
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

        {/* ── Live ticker tape — shows real WS prices ── */}
        {shares.length > 0 && (
          <div style={{ overflow:"hidden", borderBottom:"1px solid #0e1828", background:"#060d1a", padding:"6px 0", flexShrink:0 }}>
            <div style={{ display:"inline-flex", gap:36, animation:"tickerScroll 35s linear infinite", whiteSpace:"nowrap" }}>
              {[...shares,...shares,...shares].map((s, i) => {
                const ld     = liveMap[s.id];
                const price  = ld ? ld.price : s.pricePerShare;
                const dayPct = ld ? ld.dayChangePct : 0;
                const up     = dayPct >= 0;
                const c      = up ? teal : red;
                return (
                  <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:11, fontFamily:"'DM Mono',monospace" }}>
                    <span style={{ color:"#3a4a6a", letterSpacing:1 }}>{s.companySymbol||`SH${s.id}`}</span>
                    <span style={{ color:"#c8d4f0" }}>₹{fmt(price)}</span>
                    <span style={{ color:c }}>{up?"▲":"▼"}{dayPct>=0?"+":""}{dayPct.toFixed(2)}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:14 }}>
            <div style={{ width:20, height:20, border:`2px solid #0e1828`, borderTopColor:blue, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
            <span style={{ fontSize:11, color:"#2a3550", letterSpacing:3 }}>LOADING MARKET DATA…</span>
          </div>
        ) : (
          <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:"auto", padding:"24px 28px 40px" }}>

            {/* ── DASHBOARD ── */}
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
                  <StatCard icon="⬡" label="Listed Companies" value={companies.length||"—"} color={blue}     sub={`${companies.length} active`}/>
                  <StatCard icon="◎" label="Share Listings"   value={shares.length||"—"}    color={teal}     sub={`${gainers} gainers`}/>
                  <StatCard icon="▲" label="Today's Gainers"  value={gainers}                color={teal}     sub={`${shares.length-gainers} losers`}/>
                  <StatCard icon="₹" label="Live Market Cap"  value={fmtCap(totalCap)}       color="#a78bfa"  sub={`Avg ₹${avgPrice.toFixed(0)}`}/>
                </div>

                {/* Companies grid */}
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <div style={{ width:3, height:20, background:blue, borderRadius:2, boxShadow:`0 0 8px ${blue}88` }}/>
                    <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:16, color:"#eef0f8" }}>Companies</span>
                    <span style={{ fontSize:10, color:"#1a2540", fontFamily:"'DM Mono',monospace" }}>({companies.length})</span>
                    <button onClick={() => setTab("companies")}
                      style={{ marginLeft:"auto", background:"transparent", border:"1px solid #0e1828", color:"#2a3550", padding:"4px 12px", borderRadius:6, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:2, transition:"all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color=blue; e.currentTarget.style.borderColor=blue+"44"; }}
                      onMouseLeave={e => { e.currentTarget.style.color="#2a3550"; e.currentTarget.style.borderColor="#0e1828"; }}>VIEW ALL →</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
                    {companies.slice(0,6).map((c, i) => {
                      const cs = shares.filter(s => s.companyId===c.id);
                      const cap = cs.reduce((a,s) => a+(liveMap[s.id]?.price||s.pricePerShare)*s.totalShares, 0);
                      const ac = i%4===0?blue:i%4===1?teal:i%4===2?amber:"#a78bfa";
                      return (
                        <div key={c.id} onClick={() => setTab("companies")} className="fi"
                          style={{ animationDelay:`${i*45}ms`, background:"#0a1020", border:"1px solid #0e1828", borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"all 0.2s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor=`${ac}33`; e.currentTarget.style.background="#0e1828"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor="#0e1828"; e.currentTarget.style.background="#0a1020"; }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                            <div style={{ width:36, height:36, borderRadius:8, background:`${ac}15`, border:`1px solid ${ac}30`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:13, color:ac }}>
                              {c.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13, color:"#c8d4f0", marginBottom:2 }}>{c.name}</div>
                              <span style={{ background:`${ac}18`, color:ac, padding:"1px 7px", borderRadius:4, fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>{c.sector||"—"}</span>
                            </div>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between" }}>
                            <div>
                              <div style={{ fontSize:9, color:"#1a2540", letterSpacing:2, fontFamily:"'DM Mono',monospace", marginBottom:3 }}>LISTINGS</div>
                              <div style={{ fontSize:15, fontWeight:700, color:ac }}>{cs.length}</div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:9, color:"#1a2540", letterSpacing:2, fontFamily:"'DM Mono',monospace", marginBottom:3 }}>LIVE CAP</div>
                              <div style={{ fontSize:13, fontWeight:600, color:"#6a7a9a", fontFamily:"'DM Mono',monospace" }}>{fmtCap(cap)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top movers */}
                {shares.length > 0 && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    {[
                      ["Top Gainers", [...shares].sort((a,b)=>(liveMap[b.id]?.dayChangePct||0)-(liveMap[a.id]?.dayChangePct||0)).slice(0,5), teal],
                      ["Top Losers",  [...shares].sort((a,b)=>(liveMap[a.id]?.dayChangePct||0)-(liveMap[b.id]?.dayChangePct||0)).slice(0,5), red],
                    ].map(([title, list, c]) => (
                      <div key={title} style={{ background:"#0a1020", border:"1px solid #0e1828", borderRadius:14, overflow:"hidden" }}>
                        <div style={{ padding:"14px 18px", borderBottom:"1px solid #0e1828", display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:3, height:16, background:c, borderRadius:2 }}/>
                          <span style={{ fontSize:11, color:"#6a7a9a", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{title}</span>
                        </div>
                        {list.map(s => {
                          const ld     = liveMap[s.id];
                          const price  = ld ? ld.price : s.pricePerShare;
                          const dayPct = ld ? ld.dayChangePct : 0;
                          return (
                            <div key={s.id} onClick={() => setSelected({ share:s, liveData:ld||defaultLive(s) })}
                              style={{ padding:"11px 18px", borderBottom:"1px solid #060d1a", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", transition:"background 0.15s" }}
                              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <div style={{ background:`${c}15`, border:`1px solid ${c}30`, color:c, padding:"2px 8px", borderRadius:4, fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>
                                  {s.companySymbol||`SH${s.id}`}
                                </div>
                                <span style={{ fontSize:12, color:"#eef0f8", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>₹{fmt(price)}</span>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <LiveSparkline history={ld?.history||[price]} width={40} height={18}/>
                                <span style={{ fontSize:12, color:dayPct>=0?teal:red, fontFamily:"'DM Mono',monospace", fontWeight:600, minWidth:60, textAlign:"right" }}>
                                  {dayPct>=0?"+":""}{dayPct.toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {list.length===0 && <div style={{ padding:20, textAlign:"center", color:"#1a2540", fontSize:11 }}>None</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── COMPANIES ── */}
            {tab === "companies" && (
              <div className="fi" style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <BackBtn onClick={() => setTab("dashboard")}/>
                    <div>
                      <div style={{ fontSize:9, color:"#1a2540", letterSpacing:4, textTransform:"uppercase", marginBottom:2 }}>Registry</div>
                      <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:24, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>Companies</h1>
                    </div>
                  </div>
                  <span style={{ fontSize:10, color:"#1a2540", fontFamily:"'DM Mono',monospace" }}>{companies.length} registered</span>
                </div>
                {companies.length===0 && <div style={{ textAlign:"center", padding:60, color:"#1a2540", fontSize:12 }}>No companies registered</div>}
                {companies.map((c, i) => (
                  <div key={c.id} className="fi" style={{ animationDelay:`${i*50}ms` }}>
                    <CompanyCard company={c} shares={shares} liveMap={liveMap} onShareClick={(s,ld) => setSelected({ share:s, liveData:ld||defaultLive(s) })}/>
                  </div>
                ))}
                <div style={{ height:24 }}/>
              </div>
            )}

            {/* ── EXCHANGE ── */}
            {tab === "shares" && (
              <div className="fi" style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <BackBtn onClick={() => setTab("dashboard")}/>
                    <div>
                      <div style={{ fontSize:9, color:"#1a2540", letterSpacing:4, textTransform:"uppercase", marginBottom:2 }}>Live Market</div>
                      <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:24, fontWeight:800, color:"#eef0f8", letterSpacing:-0.5, lineHeight:1 }}>Exchange</h1>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:connected?teal:red, animation:connected?"pulseDot 1.5s infinite":"none" }}/>
                      <span style={{ fontSize:9, color:connected?teal:red, letterSpacing:2 }}>{connected?"WS · 3S TICKS":"RECONNECTING"}</span>
                    </div>
                    <span style={{ fontSize:10, color:gainers>0?teal:red, fontFamily:"'DM Mono',monospace" }}>▲{gainers} ▼{shares.length-gainers}</span>
                  </div>
                </div>

                {/* Constraint info bar */}
                <div style={{ background:"#0a1020", border:"1px solid #0e1828", borderRadius:10, padding:"12px 18px", display:"flex", gap:28, flexWrap:"wrap" }}>
                  {[
                    { label:"Tick deviation",  val:"±5% max",        color:blue },
                    { label:"Daily circuit",   val:"±20% cap",       color:amber },
                    { label:"Update interval", val:"3 seconds",      color:teal },
                    { label:"Transport",       val:"WebSocket/STOMP", color:"#a78bfa" },
                  ].map(it => (
                    <div key={it.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:it.color }}/>
                      <span style={{ fontSize:9, color:"#2a3550", letterSpacing:2, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{it.label}</span>
                      <span style={{ fontSize:11, color:it.color, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{it.val}</span>
                    </div>
                  ))}
                </div>

                {/* Search + filter */}
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <div style={{ position:"relative", flex:1, minWidth:220 }}>
                    <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"#1a2540", fontSize:14 }}>⌕</span>
                    <input placeholder="Search symbol or company…" value={search} onChange={e => setSearch(e.target.value)}
                      style={{ background:"#060d1a", border:"1px solid #0e1828", borderRadius:8, padding:"9px 12px 9px 32px", color:"#c8d4f0", fontFamily:"'DM Mono',monospace", fontSize:12, outline:"none", width:"100%", transition:"border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor="#1e3a5a"}
                      onBlur={e  => e.target.style.borderColor="#0e1828"}/>
                  </div>
                  {["All","Gainers","Losers","High Float","Circuit"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ background:filter===f?"rgba(0,184,255,0.1)":"transparent", border:`1px solid ${filter===f?"rgba(0,184,255,0.3)":"#0e1828"}`, color:filter===f?blue:"#2a3550", padding:"8px 14px", borderRadius:7, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:1, textTransform:"uppercase", transition:"all 0.15s" }}>{f}</button>
                  ))}
                </div>

                {/* Live table */}
                <div style={{ background:"#0a1020", border:"1px solid #0e1828", borderRadius:14, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #0e1828", background:"#060d1a" }}>
                        {["Symbol","Live Price","Day Chg","Open","High","Low","Float","Trend"].map(h => (
                          <th key={h} style={{ ...TH, textAlign:["Live Price","Day Chg","Open","High","Low"].includes(h)?"right":"left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShares.map(s => (
                        <LiveShareRow
                          key={s.id}
                          share={s}
                          liveData={liveMap[s.id] ?? defaultLive(s)}
                          onClick={(sh, ld) => setSelected({ share:sh, liveData:ld })}
                        />
                      ))}
                    </tbody>
                  </table>
                  {filteredShares.length===0 && (
                    <div style={{ textAlign:"center", padding:48, color:"#1a2540", fontSize:11, letterSpacing:2 }}>NO SHARES MATCH YOUR CRITERIA</div>
                  )}
                </div>

                {filteredShares.length > 0 && (
                  <div style={{ textAlign:"center", fontSize:10, color:"#1a2540", letterSpacing:2 }}>
                    SHOWING {filteredShares.length} OF {shares.length} · WS BACKEND · 3S TICKS
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