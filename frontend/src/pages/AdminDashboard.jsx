import { useState, useEffect, useRef } from "react";
import { getCompanies, createCompany, deleteCompany, getShares, createShare } from "../api";
import axios from "axios";

const AUTH_API  = axios.create({ baseURL: "http://localhost:8081" });
const TRADE_API = axios.create({ baseURL: "http://localhost:8083" });

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `linear-gradient(135deg, #0f1535, #12183d)` : "#0c1230",
        border: `1px solid ${hov ? accent + "66" : "#1e2a50"}`,
        borderRadius: 14,
        padding: "22px 24px",
        display: "flex", flexDirection: "column", gap: 10,
        position: "relative", overflow: "hidden",
        transition: "all 0.25s",
        boxShadow: hov ? `0 8px 32px ${accent}18` : "none",
        cursor: "default",
      }}
    >
      <div style={{ position: "absolute", top: -20, right: -20, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, transition: "opacity 0.3s", opacity: hov ? 1 : 0.5 }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, borderRadius: "14px 14px 0 0", opacity: hov ? 1 : 0.4, transition: "opacity 0.25s" }} />
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 30, fontWeight: 700, color: "#f0eaff", fontFamily: "'Playfair Display', serif", letterSpacing: -0.5 }}>{value}</span>
      <span style={{ fontSize: 10, color: "#4a5580", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: 3 }}>{label}</span>
    </div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function Field({ placeholder, value, onChange, type = "text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: focused ? "#0a0f28" : "#080d22",
        border: `1px solid ${focused ? "#7c5cfc88" : "#1e2a50"}`,
        borderRadius: 8, padding: "11px 14px", color: "#c8d0f0",
        fontFamily: "'DM Mono', monospace", fontSize: 12, outline: "none",
        width: "100%", boxSizing: "border-box", transition: "all 0.2s",
        boxShadow: focused ? "0 0 0 3px #7c5cfc18" : "none",
      }}
    />
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, danger, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: danger
          ? hov ? "rgba(255,80,100,0.25)" : "rgba(255,80,100,0.1)"
          : hov ? "rgba(124,92,252,0.3)" : "rgba(124,92,252,0.12)",
        border: `1px solid ${danger ? (hov ? "#ff5064cc" : "#ff506444") : (hov ? "#7c5cfccc" : "#7c5cfc55")}`,
        color: danger ? "#ff8090" : (hov ? "#c4b0ff" : "#a48dff"),
        padding: "11px 22px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 12,
        letterSpacing: 1, transition: "all 0.2s", whiteSpace: "nowrap",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, visible, ok }) {
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28,
      background: "linear-gradient(135deg, #0f1535, #14194a)",
      border: `1px solid ${ok === false ? "#ff506666" : "#7c5cfc66"}`,
      color: ok === false ? "#ff8090" : "#a48dff",
      padding: "13px 22px", borderRadius: 10,
      fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 1,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.96)",
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      pointerEvents: "none", zIndex: 9999,
      boxShadow: visible ? "0 8px 32px #7c5cfc22" : "none",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ fontSize: 14 }}>{ok === false ? "✕" : "✦"}</span> {msg}
    </div>
  );
}

// ─── Logout Confirm ───────────────────────────────────────────────────────────
function LogoutConfirm({ onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,6,20,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, backdropFilter: "blur(6px)" }}>
      <div style={{ background: "linear-gradient(145deg, #0d1235, #111840)", border: "1px solid #ff506455", borderTop: "2px solid #ff5064", borderRadius: 16, padding: "36px 44px", textAlign: "center", boxShadow: "0 24px 80px rgba(255,80,100,0.12)", minWidth: 300 }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>⚠</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#f0eaff", fontWeight: 700, marginBottom: 8, letterSpacing: -0.3 }}>Sign Out</div>
        <div style={{ fontSize: 12, color: "#4a5580", fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 26 }}>End this admin session?</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ background: "transparent", border: "1px solid #1e2a50", color: "#4a5580", padding: "9px 22px", borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#c8d0f0"; e.currentTarget.style.borderColor = "#3a4870"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#4a5580"; e.currentTarget.style.borderColor = "#1e2a50"; }}>CANCEL</button>
          <button onClick={onConfirm} style={{ background: "rgba(255,80,100,0.12)", border: "1px solid #ff506455", color: "#ff8090", padding: "9px 22px", borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,80,100,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,80,100,0.12)"}>SIGN OUT</button>
        </div>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, accent, children, action }) {
  return (
    <div style={{ background: "#0a0e28", border: "1px solid #1a2248", borderRadius: 16, padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 3, height: 20, background: accent, borderRadius: 2, boxShadow: `0 0 8px ${accent}88` }} />
        <h2 style={{ margin: 0, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: "#4a5580", letterSpacing: 3, textTransform: "uppercase" }}>{title}</h2>
        {action && <div style={{ marginLeft: "auto" }}>{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Delete Button ────────────────────────────────────────────────────────────
function DelBtn({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? "rgba(255,80,100,0.18)" : "rgba(255,80,100,0.07)", border: `1px solid ${hov ? "#ff506466" : "#ff506422"}`, color: "#ff8090", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, letterSpacing: 1, transition: "all 0.15s" }}>
      DELETE
    </button>
  );
}

// ─── Sync Status Badge ────────────────────────────────────────────────────────
function SyncBadge({ status }) {
  const cfg = {
    idle:    { color: "#4a5580", bg: "transparent",              border: "#1e2a50",   label: "TRADE SYNC" },
    syncing: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",    border: "#fbbf2444", label: "SYNCING…"   },
    ok:      { color: "#34d399", bg: "rgba(52,211,153,0.08)",    border: "#34d39944", label: "SYNCED ✓"   },
    error:   { color: "#ff8090", bg: "rgba(255,80,100,0.08)",    border: "#ff506444", label: "SYNC FAILED" },
  }[status] || {};
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 6, padding: "5px 12px" }}>
      {status === "syncing" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, animation: "pulseViolet 0.8s infinite" }} />}
      {status === "ok"      && <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color }} />}
      <span style={{ fontSize: 9, color: cfg.color, fontFamily: "'DM Mono', monospace", letterSpacing: 2 }}>{cfg.label}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard({ onSignOut }) {
  const [companies,  setCompanies]  = useState([]);
  const [shares,     setShares]     = useState([]);
  const [users,      setUsers]      = useState([]);
  const [activeTab,  setActiveTab]  = useState("overview");
  const [showLogout, setShowLogout] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | ok | error

  const [compForm,  setCompForm]  = useState({ name: "", sector: "IT", desc: "" });
  const [shareForm, setShareForm] = useState({ companyId: "", price: "", total: "100000", available: "80000" });

  const [toast,   setToast]   = useState({ msg: "", visible: false, ok: true });
  const toastRef = useRef(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, visible: true, ok });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [cRes, sRes, uRes] = await Promise.allSettled([
        getCompanies(),
        getShares(),
        AUTH_API.get("/auth/users"),
      ]);
      if (cRes.status === "fulfilled") setCompanies(cRes.value.data);
      if (sRes.status === "fulfilled") setShares(sRes.value.data);
      if (uRes.status === "fulfilled") setUsers(uRes.value.data);
    } catch (err) { console.error(err); }
  };

  // ── Trigger trade-service sync ─────────────────────────────────────────────
  const triggerSync = async () => {
    setSyncStatus("syncing");
    try {
      await TRADE_API.post("/admin/sync");
      setSyncStatus("ok");
      showToast("Trade-service synced ✓");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err) {
      setSyncStatus("error");
      showToast("Sync failed — is trade-service running?", false);
      setTimeout(() => setSyncStatus("idle"), 4000);
    }
  };

  // ── Add company → auto sync ────────────────────────────────────────────────
  const addCompany = async () => {
    if (!compForm.name.trim()) return;
    try {
      await createCompany({
        name: compForm.name,
        symbol: compForm.name.substring(0, 4).toUpperCase(),
        sector: compForm.sector,
        description: compForm.desc,
        logoUrl: "",
      });
      const res = await getCompanies();
      setCompanies(res.data);
      setCompForm({ name: "", sector: "IT", desc: "" });
      showToast("Company registered");
    } catch (err) {
      showToast("Failed to add company", false);
      console.error(err);
    }
  };

  // ── Add share → auto sync so trade-service picks up real seed price ────────
  const addShare = async () => {
    if (!shareForm.price || !shareForm.companyId) return;
    try {
      await createShare({
        companyId:       parseInt(shareForm.companyId),
        totalShares:     parseInt(shareForm.total),
        availableShares: parseInt(shareForm.available),
        pricePerShare:   parseFloat(shareForm.price),
      });
      const res = await getShares();
      setShares(res.data);
      setShareForm({ companyId: "", price: "", total: "100000", available: "80000" });
      showToast("Share listing added — syncing trade-service…");
      // Sync immediately so MarketEngine starts from real price
      await triggerSync();
    } catch (err) {
      showToast("Failed to add share listing", false);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCompany(id);
      setCompanies(cs => cs.filter(c => c.id !== id));
      showToast("Company removed");
    } catch (err) {
      showToast("Delete failed", false);
      console.error(err);
    }
  };

  const handleSignOut = () => { setShowLogout(false); if (onSignOut) onSignOut(); };

  const totalMarketValue = shares.reduce((sum, s) => sum + s.pricePerShare * s.totalShares, 0);

  // Map companyId → share for quick lookup in tables
  const shareMap = Object.fromEntries(shares.map(s => [s.companyId, s]));

  const tabs = [
    { id: "overview",  label: "Overview",  icon: "◈" },
    { id: "companies", label: "Companies", icon: "⬡" },
    { id: "shares",    label: "Shares",    icon: "◎" },
    { id: "users",     label: "Users",     icon: "◉" },
  ];

  const TH = { textAlign: "left", padding: "8px 14px", fontSize: 10, color: "#2e3d6a", letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Mono', monospace" };
  const TD = { padding: "13px 14px", borderBottom: "1px solid #0e1430", fontFamily: "'DM Mono', monospace", fontSize: 12 };
  const rowHover = (e, on) => e.currentTarget.style.background = on ? "rgba(124,92,252,0.04)" : "transparent";
  const selectStyle = { background: "#080d22", border: "1px solid #1e2a50", borderRadius: 8, padding: "11px 14px", color: "#c8d0f0", fontFamily: "'DM Mono', monospace", fontSize: 12, outline: "none", width: "100%", cursor: "pointer" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: #1e2a50 !important; }
        select option { background: #080d22; color: #c8d0f0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a2248; border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseViolet { 0%,100%{opacity:1;box-shadow:0 0 4px #7c5cfc;} 50%{opacity:0.5;box-shadow:none;} }
        .rfade { animation: fadeUp 0.3s ease both; }
      `}</style>

      {showLogout && <LogoutConfirm onConfirm={handleSignOut} onCancel={() => setShowLogout(false)} />}
      <Toast msg={toast.msg} visible={toast.visible} ok={toast.ok} />

      <div style={{ background: "#060919", minHeight: "100vh", color: "#c8d0f0", fontFamily: "'DM Mono', monospace", display: "flex" }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 230, background: "linear-gradient(180deg, #080d22 0%, #060919 100%)", borderRight: "1px solid #0e1635", padding: "28px 14px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, position: "relative" }}>
          <div style={{ position: "absolute", top: 0, right: -1, width: 1, height: "40%", background: "linear-gradient(180deg, #7c5cfc55, transparent)" }} />

          <div style={{ padding: "0 10px 26px" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, color: "#f0eaff", letterSpacing: -0.5, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c5cfc", boxShadow: "0 0 10px #7c5cfc", display: "inline-block", flexShrink: 0 }} />
              Nexus
            </div>
            <div style={{ fontSize: 9, color: "#2e3d6a", letterSpacing: 4, textTransform: "uppercase", marginTop: 4 }}>Admin Console</div>
          </div>

          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: activeTab === t.id ? "rgba(124,92,252,0.1)" : "transparent", border: "none", borderRadius: 8, color: activeTab === t.id ? "#a48dff" : "#2e3d6a", padding: "11px 14px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%", transition: "all 0.18s", borderLeft: activeTab === t.id ? "2px solid #7c5cfc" : "2px solid transparent" }}
              onMouseEnter={e => { if (activeTab !== t.id) { e.currentTarget.style.color = "#7c8ab0"; e.currentTarget.style.background = "rgba(124,92,252,0.04)"; } }}
              onMouseLeave={e => { if (activeTab !== t.id) { e.currentTarget.style.color = "#2e3d6a"; e.currentTarget.style.background = "transparent"; } }}>
              <span style={{ fontSize: 13, opacity: activeTab === t.id ? 1 : 0.5 }}>{t.icon}</span>
              {t.label}
              {t.id === "users" && users.length > 0 && (
                <span style={{ marginLeft: "auto", background: "rgba(124,92,252,0.2)", color: "#a48dff", fontSize: 9, borderRadius: 4, padding: "2px 7px" }}>{users.length}</span>
              )}
            </button>
          ))}

          <div style={{ marginTop: "auto", padding: "16px 10px 0", borderTop: "1px solid #0e1635" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #7c5cfc, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>A</div>
              <div>
                <div style={{ fontSize: 11, color: "#c8d0f0", fontWeight: 500 }}>Admin</div>
                <div style={{ fontSize: 9, color: "#2e3d6a", letterSpacing: 1 }}>Super User</div>
              </div>
            </div>
            <button onClick={() => setShowLogout(true)}
              style={{ width: "100%", background: "transparent", border: "1px solid #1e2a50", borderRadius: 7, color: "#2e3d6a", padding: "8px 12px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ff8090"; e.currentTarget.style.borderColor = "#ff506444"; e.currentTarget.style.background = "rgba(255,80,100,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#2e3d6a"; e.currentTarget.style.borderColor = "#1e2a50"; e.currentTarget.style.background = "transparent"; }}>
              <span>⏻</span> Sign Out
            </button>
          </div>
        </div>

        {/* ── Main ── */}
        <div style={{ flex: 1, padding: "30px 34px", overflowY: "auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: "#f0eaff", letterSpacing: -0.5 }}>
                {tabs.find(t => t.id === activeTab)?.label}
              </h1>
              <p style={{ margin: "5px 0 0", fontSize: 10, color: "#2e3d6a", letterSpacing: 2, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <SyncBadge status={syncStatus} />
              <button onClick={triggerSync} disabled={syncStatus === "syncing"}
                style={{ background: "rgba(124,92,252,0.08)", border: "1px solid #7c5cfc33", color: "#4a5580", borderRadius: 8, padding: "9px 16px", cursor: syncStatus === "syncing" ? "not-allowed" : "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", transition: "all 0.18s", opacity: syncStatus === "syncing" ? 0.6 : 1 }}
                onMouseEnter={e => { if (syncStatus !== "syncing") { e.currentTarget.style.color = "#a48dff"; e.currentTarget.style.borderColor = "#7c5cfc77"; } }}
                onMouseLeave={e => { e.currentTarget.style.color = "#4a5580"; e.currentTarget.style.borderColor = "#7c5cfc33"; }}>
                ⟳ Sync Trade
              </button>
              <button onClick={fetchAll}
                style={{ background: "rgba(124,92,252,0.08)", border: "1px solid #7c5cfc33", color: "#4a5580", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", transition: "all 0.18s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#a48dff"; e.currentTarget.style.borderColor = "#7c5cfc77"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#4a5580"; e.currentTarget.style.borderColor = "#7c5cfc33"; }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                <StatCard icon="⬡" label="Companies"      value={companies.length}                              accent="#7c5cfc" />
                <StatCard icon="◎" label="Share Listings"  value={shares.length}                                accent="#38bdf8" />
                <StatCard icon="◉" label="Total Users"     value={users.length}                                 accent="#fb923c" />
                <StatCard icon="₹" label="Market Value"    value={`₹${(totalMarketValue / 1e6).toFixed(1)}M`}  accent="#a855f7" />
              </div>

              <SectionCard title="Recent Companies" accent="#7c5cfc">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #0e1430" }}>
                      {["Symbol","Name","Sector","IPO Price","Action"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.slice(0, 5).map((c, i) => (
                      <tr key={c.id} className="rfade" style={{ animationDelay: `${i * 55}ms` }}
                        onMouseEnter={e => rowHover(e, true)} onMouseLeave={e => rowHover(e, false)}>
                        <td style={TD}><span style={{ background: "rgba(124,92,252,0.12)", color: "#a48dff", padding: "3px 10px", borderRadius: 5, fontSize: 11, letterSpacing: 1 }}>{c.symbol || c.name?.substring(0, 4).toUpperCase()}</span></td>
                        <td style={{ ...TD, color: "#e8e0ff", fontWeight: 500 }}>{c.name}</td>
                        <td style={{ ...TD, color: "#2e3d6a" }}>{c.sector}</td>
                        <td style={{ ...TD, color: "#7dd3fc" }}>
                          {shareMap[c.id] ? `₹${Number(shareMap[c.id].pricePerShare).toLocaleString("en-IN")}` : <span style={{ color: "#1e2a50" }}>No listing</span>}
                        </td>
                        <td style={TD}><DelBtn onClick={() => handleDelete(c.id)} /></td>
                      </tr>
                    ))}
                    {companies.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 30, color: "#1e2a50", fontSize: 12 }}>No companies yet</td></tr>}
                  </tbody>
                </table>
              </SectionCard>

              <SectionCard title="Recent Users" accent="#fb923c">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #0e1430" }}>
                      {["#","Name","Email","Role"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 5).map((u, i) => (
                      <tr key={u.id || i} className="rfade" style={{ animationDelay: `${i * 55}ms` }}
                        onMouseEnter={e => rowHover(e, true)} onMouseLeave={e => rowHover(e, false)}>
                        <td style={{ ...TD, color: "#1e2a50" }}>{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ ...TD, color: "#e8e0ff", fontWeight: 500 }}>{u.name || u.username || "—"}</td>
                        <td style={{ ...TD, color: "#2e3d6a" }}>{u.email || "—"}</td>
                        <td style={TD}>
                          <span style={{ background: u.role === "ADMIN" ? "rgba(168,85,247,0.15)" : "rgba(251,146,60,0.1)", color: u.role === "ADMIN" ? "#c084fc" : "#fb923c", padding: "3px 10px", borderRadius: 5, fontSize: 10, letterSpacing: 1 }}>{u.role || "USER"}</span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 30, color: "#1e2a50" }}>No users found</td></tr>}
                  </tbody>
                </table>
              </SectionCard>
            </div>
          )}

          {/* ── COMPANIES ── */}
          {activeTab === "companies" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <SectionCard title="Add Company" accent="#7c5cfc">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 12, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 9, color: "#2e3d6a", letterSpacing: 3, textTransform: "uppercase" }}>Name *</label>
                    <Field placeholder="e.g. Reliance" value={compForm.name} onChange={e => setCompForm({ ...compForm, name: e.target.value })} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 9, color: "#2e3d6a", letterSpacing: 3, textTransform: "uppercase" }}>Sector</label>
                    <select value={compForm.sector} onChange={e => setCompForm({ ...compForm, sector: e.target.value })} style={selectStyle}>
                      {["IT","Finance","Healthcare","Energy","FMCG","Telecom","Auto","Infra","Retail"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 9, color: "#2e3d6a", letterSpacing: 3, textTransform: "uppercase" }}>Description</label>
                    <Field placeholder="Brief description…" value={compForm.desc} onChange={e => setCompForm({ ...compForm, desc: e.target.value })} />
                  </div>
                  <PrimaryBtn onClick={addCompany}>+ Add</PrimaryBtn>
                </div>
                <div style={{ fontSize: 10, color: "#2e3d6a", fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                  ℹ After adding a company, go to <span style={{ color: "#7c5cfc" }}>Shares tab</span> to set its price — trade-service will sync automatically.
                </div>
              </SectionCard>

              <SectionCard title={`All Companies (${companies.length})`} accent="#7c5cfc">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #0e1430" }}>
                      {["Symbol","Name","Sector","Description","IPO Price","Action"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c, i) => (
                      <tr key={c.id} className="rfade" style={{ animationDelay: `${i * 40}ms` }}
                        onMouseEnter={e => rowHover(e, true)} onMouseLeave={e => rowHover(e, false)}>
                        <td style={TD}><span style={{ background: "rgba(124,92,252,0.12)", color: "#a48dff", padding: "3px 10px", borderRadius: 5, fontSize: 11, letterSpacing: 1 }}>{c.symbol || c.name?.substring(0, 4).toUpperCase()}</span></td>
                        <td style={{ ...TD, color: "#e8e0ff", fontWeight: 500 }}>{c.name}</td>
                        <td style={TD}><span style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8", padding: "3px 10px", borderRadius: 5, fontSize: 10, letterSpacing: 1 }}>{c.sector}</span></td>
                        <td style={{ ...TD, color: "#2e3d6a", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description || "—"}</td>
                        <td style={{ ...TD }}>
                          {shareMap[c.id]
                            ? <span style={{ color: "#7dd3fc", fontWeight: 600 }}>₹{Number(shareMap[c.id].pricePerShare).toLocaleString("en-IN")}</span>
                            : <span style={{ color: "#ff8090", fontSize: 10 }}>⚠ No share listing</span>}
                        </td>
                        <td style={TD}><DelBtn onClick={() => handleDelete(c.id)} /></td>
                      </tr>
                    ))}
                    {companies.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 36, color: "#1e2a50" }}>No companies added yet</td></tr>}
                  </tbody>
                </table>
              </SectionCard>
            </div>
          )}

          {/* ── SHARES ── */}
          {activeTab === "shares" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <SectionCard title="Add Share Listing" accent="#38bdf8">
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 9, color: "#2e3d6a", letterSpacing: 3, textTransform: "uppercase" }}>Company *</label>
                    <select value={shareForm.companyId} onChange={e => setShareForm({ ...shareForm, companyId: e.target.value })} style={selectStyle}>
                      <option value="">Select company…</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{shareMap[c.id] ? ` ✓` : " (no listing)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 9, color: "#2e3d6a", letterSpacing: 3, textTransform: "uppercase" }}>Price (₹) *</label>
                    <Field type="number" placeholder="e.g. 1500" value={shareForm.price} onChange={e => setShareForm({ ...shareForm, price: e.target.value })} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 9, color: "#2e3d6a", letterSpacing: 3, textTransform: "uppercase" }}>Total Shares</label>
                    <Field type="number" placeholder="100000" value={shareForm.total} onChange={e => setShareForm({ ...shareForm, total: e.target.value })} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 9, color: "#2e3d6a", letterSpacing: 3, textTransform: "uppercase" }}>Available</label>
                    <Field type="number" placeholder="80000" value={shareForm.available} onChange={e => setShareForm({ ...shareForm, available: e.target.value })} />
                  </div>
                  <PrimaryBtn onClick={addShare} disabled={syncStatus === "syncing"}>+ Add</PrimaryBtn>
                </div>
                <div style={{ fontSize: 10, color: "#2e3d6a", fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                  ℹ Adding a listing will immediately sync the price to trade-service as the opening price for MarketEngine.
                </div>
              </SectionCard>

              <SectionCard title={`Share Listings (${shares.length})`} accent="#38bdf8">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #0e1430" }}>
                      {["Company","Price / Share","Total Shares","Available","Market Cap","Float"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {shares.map((s, i) => {
                      const company = companies.find(c => c.id === s.companyId);
                      const cap = s.pricePerShare * s.totalShares;
                      const pct = ((s.availableShares / s.totalShares) * 100).toFixed(1);
                      return (
                        <tr key={s.id} className="rfade" style={{ animationDelay: `${i * 40}ms` }}
                          onMouseEnter={e => rowHover(e, true)} onMouseLeave={e => rowHover(e, false)}>
                          <td style={{ ...TD, color: "#e8e0ff", fontWeight: 500 }}>
                            {company
                              ? <><span style={{ background: "rgba(124,92,252,0.12)", color: "#a48dff", padding: "2px 8px", borderRadius: 4, fontSize: 10, marginRight: 8 }}>{company.symbol || company.name.substring(0,4).toUpperCase()}</span>{company.name}</>
                              : <span style={{ color: "#2e3d6a" }}>ID #{s.companyId}</span>}
                          </td>
                          <td style={{ ...TD, color: "#7dd3fc", fontSize: 14, fontWeight: 500 }}>₹{Number(s.pricePerShare).toLocaleString("en-IN")}</td>
                          <td style={{ ...TD, color: "#c8d0f0" }}>{Number(s.totalShares).toLocaleString()}</td>
                          <td style={{ ...TD, color: "#38bdf8" }}>{Number(s.availableShares).toLocaleString()}</td>
                          <td style={{ ...TD, color: "#c084fc" }}>₹{(cap / 1e6).toFixed(2)}M</td>
                          <td style={TD}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 4, background: "#0e1430", borderRadius: 2 }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #7c5cfc, #38bdf8)", borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 10, color: "#2e3d6a", minWidth: 34 }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {shares.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 36, color: "#1e2a50" }}>No share listings yet</td></tr>}
                  </tbody>
                </table>
              </SectionCard>
            </div>
          )}

          {/* ── USERS ── */}
          {activeTab === "users" && (
            <SectionCard title={`All Users (${users.length})`} accent="#fb923c">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #0e1430" }}>
                    {["#","Name","Email","Role","Status"].map(h => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id || i} className="rfade" style={{ animationDelay: `${i * 30}ms` }}
                      onMouseEnter={e => rowHover(e, true)} onMouseLeave={e => rowHover(e, false)}>
                      <td style={{ ...TD, color: "#1e2a50" }}>{String(i + 1).padStart(2, "0")}</td>
                      <td style={TD}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: `hsl(${((u.id || i) * 53 + 240) % 360}, 55%, 35%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                            {(u.name || u.username || "U")[0].toUpperCase()}
                          </div>
                          <span style={{ color: "#e8e0ff", fontWeight: 500 }}>{u.name || u.username || "—"}</span>
                        </div>
                      </td>
                      <td style={{ ...TD, color: "#2e3d6a" }}>{u.email || "—"}</td>
                      <td style={TD}>
                        <span style={{ background: u.role === "ADMIN" ? "rgba(168,85,247,0.15)" : "rgba(251,146,60,0.1)", color: u.role === "ADMIN" ? "#c084fc" : "#fb923c", padding: "3px 10px", borderRadius: 5, fontSize: 10, letterSpacing: 1 }}>{u.role || "USER"}</span>
                      </td>
                      <td style={TD}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c5cfc", animation: "pulseViolet 2.5s infinite", animationDelay: `${i * 180}ms` }} />
                          <span style={{ fontSize: 10, color: "#2e3d6a", letterSpacing: 1 }}>Active</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 36, color: "#1e2a50" }}>No users found. Check if API is running.</td></tr>}
                </tbody>
              </table>
            </SectionCard>
          )}

        </div>
      </div>
    </>
  );
}