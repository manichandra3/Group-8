import { useState } from "react";
import { useData } from "../context/DataContext";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .adm-wrap { font-family: 'DM Mono', 'Courier New', monospace; background: #0a0c10; min-height: 100vh; color: #e2e8f0; display: flex; }

  .adm-sidebar { width: 220px; min-height: 100vh; background: #0d1117; border-right: 1px solid #1e2530; display: flex; flex-direction: column; flex-shrink: 0; }
  .adm-logo { padding: 20px 18px 16px; border-bottom: 1px solid #1e2530; }
  .adm-logo-text { font-size: 13px; font-weight: 700; letter-spacing: 3px; color: #00d4aa; text-transform: uppercase; }
  .adm-logo-sub { font-size: 10px; color: #4a5568; letter-spacing: 2px; margin-top: 2px; }
  .adm-nav { padding: 12px 0; flex: 1; }
  .adm-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 18px; font-size: 12px; letter-spacing: 1px; color: #4a5568; cursor: pointer; transition: all 0.15s; border-left: 2px solid transparent; font-family: inherit; background: transparent; border-right: none; border-top: none; border-bottom: none; width: 100%; text-align: left; }
  .adm-nav-item:hover { color: #a0aec0; background: #111820; }
  .adm-nav-item.active { color: #00d4aa; border-left-color: #00d4aa; background: #0d1f1a; }
  .adm-sidebar-footer { padding: 16px 18px; border-top: 1px solid #1e2530; }
  .adm-sidebar-footer-label { font-size: 10px; color: #2d3748; letter-spacing: 1px; }
  .adm-sidebar-footer-status { font-size: 11px; color: #4a5568; margin-top: 4px; }

  .adm-main { flex: 1; padding: 24px 28px; overflow-x: hidden; }
  .adm-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .adm-page-title { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #4a5568; }
  .adm-page-heading { font-size: 22px; font-weight: 700; color: #e2e8f0; margin-top: 2px; font-family: 'Space Grotesk', sans-serif; }
  .adm-badge { background: #00d4aa18; border: 1px solid #00d4aa40; color: #00d4aa; font-size: 10px; padding: 3px 10px; border-radius: 20px; letter-spacing: 1px; }

  .adm-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  .adm-stat-card { background: #0d1117; border: 1px solid #1e2530; border-radius: 10px; padding: 18px; position: relative; overflow: hidden; }
  .adm-stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .adm-stat-card.green::before { background: #00d4aa; }
  .adm-stat-card.blue::before { background: #4299e1; }
  .adm-stat-card.amber::before { background: #f6ad55; }
  .adm-stat-card.red::before { background: #fc8181; }
  .adm-stat-label { font-size: 10px; letter-spacing: 2px; color: #4a5568; text-transform: uppercase; margin-bottom: 8px; }
  .adm-stat-value { font-size: 26px; font-weight: 700; color: #e2e8f0; font-family: 'Space Grotesk', sans-serif; }
  .adm-stat-change { font-size: 11px; margin-top: 6px; }
  .up { color: #00d4aa; }
  .down { color: #fc8181; }

  .adm-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .adm-two-col-sidebar { display: grid; grid-template-columns: 1fr 340px; gap: 18px; }

  .adm-panel { background: #0d1117; border: 1px solid #1e2530; border-radius: 10px; margin-bottom: 20px; overflow: hidden; }
  .adm-panel-header { padding: 16px 20px; border-bottom: 1px solid #1e2530; display: flex; align-items: center; justify-content: space-between; }
  .adm-panel-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #a0aec0; }
  .adm-panel-body { padding: 20px; }

  .adm-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .adm-table thead tr { border-bottom: 1px solid #1e2530; }
  .adm-table th { text-align: left; padding: 8px 12px; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #4a5568; font-weight: 400; font-family: inherit; }
  .adm-table td { padding: 11px 12px; color: #a0aec0; border-bottom: 1px solid #1a1f28; }
  .adm-table tr:last-child td { border-bottom: none; }
  .adm-table tbody tr:hover td { background: #111820; color: #e2e8f0; }

  .chip { font-size: 10px; padding: 3px 9px; border-radius: 4px; letter-spacing: 1px; font-weight: 600; display: inline-block; }
  .chip.active { background: #00d4aa18; color: #00d4aa; border: 1px solid #00d4aa30; }
  .chip.blocked { background: #fc818118; color: #fc8181; border: 1px solid #fc818130; }
  .chip.buy { background: #00d4aa18; color: #00d4aa; border: 1px solid #00d4aa30; }
  .chip.sell { background: #f6ad5518; color: #f6ad55; border: 1px solid #f6ad5530; }
  .chip.nse { background: #4299e118; color: #4299e1; border: 1px solid #4299e130; }
  .chip.bse { background: #9f7aea18; color: #9f7aea; border: 1px solid #9f7aea30; }

  .adm-btn { font-family: inherit; font-size: 10px; letter-spacing: 1px; padding: 5px 12px; border-radius: 5px; cursor: pointer; border: none; transition: all 0.15s; text-transform: uppercase; }
  .adm-btn.danger { background: #fc818118; color: #fc8181; border: 1px solid #fc818130; }
  .adm-btn.danger:hover { background: #fc818130; }
  .adm-btn.ghost { background: transparent; color: #4a5568; border: 1px solid #1e2530; }
  .adm-btn.ghost:hover { color: #e2e8f0; border-color: #4a5568; }
  .adm-btn.primary { background: #00d4aa20; color: #00d4aa; border: 1px solid #00d4aa50; }
  .adm-btn.primary:hover { background: #00d4aa35; }
  .adm-btn.primary-full { background: #00d4aa20; color: #00d4aa; border: 1px solid #00d4aa50; padding: 10px; width: 100%; margin-top: 6px; font-size: 11px; }
  .adm-btn.primary-full:hover { background: #00d4aa35; }

  .adm-form { display: flex; flex-direction: column; gap: 12px; }
  .adm-form-group { display: flex; flex-direction: column; gap: 6px; }
  .adm-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #4a5568; }
  .adm-input { background: #070a0e; border: 1px solid #1e2530; border-radius: 6px; padding: 9px 12px; color: #e2e8f0; font-family: inherit; font-size: 12px; width: 100%; outline: none; transition: border 0.15s; }
  .adm-input:focus { border-color: #00d4aa50; }
  .adm-input::placeholder { color: #2d3748; }
  .adm-textarea { background: #070a0e; border: 1px solid #1e2530; border-radius: 6px; padding: 9px 12px; color: #e2e8f0; font-family: inherit; font-size: 12px; width: 100%; outline: none; transition: border 0.15s; resize: none; }
  .adm-textarea:focus { border-color: #00d4aa50; }
  .adm-select { background: #070a0e; border: 1px solid #1e2530; border-radius: 6px; padding: 9px 12px; color: #e2e8f0; font-family: inherit; font-size: 12px; width: 100%; outline: none; transition: border 0.15s; }
  .adm-select:focus { border-color: #00d4aa50; }

  .adm-success { background: #00d4aa12; border: 1px solid #00d4aa30; border-radius: 6px; padding: 12px 16px; color: #00d4aa; font-size: 12px; margin-bottom: 14px; }

  .adm-tab-row { display: flex; gap: 6px; }
  .adm-tab { font-size: 10px; letter-spacing: 1px; padding: 5px 14px; border-radius: 5px; cursor: pointer; text-transform: uppercase; border: 1px solid #1e2530; color: #4a5568; background: transparent; font-family: inherit; transition: all 0.15s; }
  .adm-tab.on { background: #00d4aa18; color: #00d4aa; border-color: #00d4aa40; }

  .adm-search { background: #070a0e; border: 1px solid #1e2530; border-radius: 6px; padding: 8px 14px; display: flex; align-items: center; gap: 8px; width: 220px; }
  .adm-search input { border: none; background: transparent; padding: 0; font-size: 12px; color: #e2e8f0; outline: none; font-family: inherit; width: 100%; }
  .adm-search input::placeholder { color: #2d3748; }
  .adm-search-icon { color: #2d3748; font-size: 14px; }

  .adm-avatar { width: 28px; height: 28px; border-radius: 50%; background: #1a2535; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .adm-user-row { display: flex; align-items: center; gap: 10px; }

  .adm-market-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1e2530; }
  .adm-market-row:last-child { border-bottom: none; }
  .adm-market-name { font-size: 12px; color: #a0aec0; }
  .adm-market-val { font-size: 14px; font-weight: 600; color: #e2e8f0; }
  .adm-market-chg { font-size: 11px; margin-left: 6px; }

  .adm-table-wrap { overflow-x: auto; }

  /* SIGN OUT BUTTON */
  .adm-logout-btn { display: flex; align-items: center; gap: 8px; width: 100%; background: transparent; border: 1px solid #1e2530; color: #4a5568; font-family: inherit; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; padding: 8px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s; margin-top: 10px; }
  .adm-logout-btn:hover { color: #fc8181; border-color: #fc818140; background: #fc818108; }
`;

const INITIAL_USERS = [
  { id: 1, name: "Rahul Sharma", email: "rahul@gmail.com", joined: "Jan 12, 2024", status: "Active", color: "#4299e1" },
  { id: 2, name: "Priya Mehta", email: "priya@gmail.com", joined: "Feb 3, 2024", status: "Blocked", color: "#fc8181" },
  { id: 3, name: "Amit Patel", email: "amit@gmail.com", joined: "Mar 8, 2024", status: "Active", color: "#00d4aa" },
];

const INITIAL_ORDERS = [
  { id: "10001", user: "Rahul", stock: "RELIANCE", exchange: "NSE", qty: 10, price: "₹2,942", type: "BUY", time: "09:31 AM" },
  { id: "10002", user: "Amit", stock: "TCS", exchange: "BSE", qty: 5, price: "₹3,810", type: "SELL", time: "10:15 AM" },
  { id: "10003", user: "Priya", stock: "INFY", exchange: "NSE", qty: 20, price: "₹1,522", type: "BUY", time: "11:02 AM" },
  { id: "10004", user: "Rahul", stock: "HDFC", exchange: "NSE", qty: 3, price: "₹1,680", type: "SELL", time: "11:44 AM" },
  { id: "10005", user: "Amit", stock: "WIPRO", exchange: "BSE", qty: 15, price: "₹492", type: "BUY", time: "01:10 PM" },
];

const NAV = [
  { id: "stats", icon: "▪", label: "Dashboard" },
  { id: "users", icon: "◈", label: "Users" },
  { id: "orders", icon: "≡", label: "Orders" },
  { id: "stocks", icon: "◉", label: "Stocks" },
  { id: "company", icon: "⬡", label: "Companies" },
];

export default function AdminDashboard({ onSignOut }) {
  const {
    stocks, addStock: ctxAddStock,
    companies, addCompany: ctxAddCompany,
    deleteCompany
  } = useData();

  const [activeTab, setActiveTab] = useState("stats");
  const [users, setUsers] = useState(INITIAL_USERS);
  const [orders] = useState(INITIAL_ORDERS);
  const [orderFilter, setOrderFilter] = useState("all");

  const [stockForm, setStockForm] = useState({ companyId: "", price: "", totalShares: "" });
  const [stockSuccess, setStockSuccess] = useState(false);

  const [compForm, setCompForm] = useState({ name: "", symbol: "", sector: "Finance", desc: "" });
  const [compSuccess, setCompSuccess] = useState(false);

  const toggleUser = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === "Active" ? "Blocked" : "Active" } : u));
  };

  const handleAddStock = () => {
    if (!stockForm.companyId || !stockForm.price) return;
    
    ctxAddStock({
      companyId: stockForm.companyId,
      price: parseFloat(stockForm.price),
      totalShares: parseInt(stockForm.totalShares || 1000000)
    });

    setStockForm({ companyId: "", price: "", totalShares: "" });
    setStockSuccess(true);
    setTimeout(() => setStockSuccess(false), 2500);
  };

  const handleAddCompany = () => {
    if (!compForm.name || !compForm.symbol) return;
    
    ctxAddCompany({
      name: compForm.name,
      symbol: compForm.symbol.toUpperCase(),
      sector: compForm.sector,
      description: compForm.desc,
      active: true
    });

    setCompForm({ name: "", symbol: "", sector: "Finance", desc: "" });
    setCompSuccess(true);
    setTimeout(() => setCompSuccess(false), 2500);
  };

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.type.toLowerCase() === orderFilter);

  return (
    <>
      <style>{styles}</style>
      <div className="adm-wrap">

        {/* Sidebar */}
        <div className="adm-sidebar">
          <div className="adm-logo">
            <div className="adm-logo-text">NSE Admin</div>
            <div className="adm-logo-sub">Control Panel v2.1</div>
          </div>
          <nav className="adm-nav">
            {NAV.map(n => (
              <button
                key={n.id}
                className={`adm-nav-item${activeTab === n.id ? " active" : ""}`}
                onClick={() => setActiveTab(n.id)}
              >
                <span style={{ width: 16, textAlign: "center" }}>{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>
          <div className="adm-sidebar-footer">
            <div className="adm-sidebar-footer-label">SYSTEM</div>
            <div className="adm-sidebar-footer-status">● Live &nbsp;|&nbsp; NSE Feed</div>
            <button className="adm-logout-btn" onClick={() => onSignOut && onSignOut()}>
              <span>⏻</span> Sign Out
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="adm-main">

          {/* DASHBOARD */}
          {activeTab === "stats" && (
            <div>
              <div className="adm-topbar">
                <div>
                  <div className="adm-page-title">Overview</div>
                  <div className="adm-page-heading">Platform Dashboard</div>
                </div>
                <div className="adm-badge">LIVE</div>
              </div>
              <div className="adm-stats-grid">
                {[
                  { label: "Total Users", value: "1,245", change: "▲ 8.2% this month", dir: "up", color: "green" },
                  { label: "Total Orders", value: "8,932", change: "▲ 12.4% this week", dir: "up", color: "blue" },
                  { label: "Total Volume", value: "₹4.2Cr", change: "▲ 3.1% today", dir: "up", color: "amber" },
                  { label: "Active Traders", value: "842", change: "▼ 2.0% vs yesterday", dir: "down", color: "red" },
                ].map(s => (
                  <div key={s.label} className={`adm-stat-card ${s.color}`}>
                    <div className="adm-stat-label">{s.label}</div>
                    <div className="adm-stat-value">{s.value}</div>
                    <div className={`adm-stat-change ${s.dir}`}>{s.change}</div>
                  </div>
                ))}
              </div>
              <div className="adm-two-col">
                <div className="adm-panel">
                  <div className="adm-panel-header">
                    <span className="adm-panel-title">Recent Orders</span>
                    <span className="chip active">Live</span>
                  </div>
                  <table className="adm-table">
                    <thead><tr><th>Stock</th><th>User</th><th>Type</th><th>Qty</th></tr></thead>
                    <tbody>
                      {orders.slice(0, 4).map(o => (
                        <tr key={o.id}>
                          <td>{o.stock}</td>
                          <td>{o.user}</td>
                          <td><span className={`chip ${o.type.toLowerCase()}`}>{o.type}</span></td>
                          <td>{o.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="adm-panel">
                  <div className="adm-panel-header"><span className="adm-panel-title">Market Summary</span></div>
                  <div className="adm-panel-body">
                    {[
                      { name: "NIFTY 50", val: "22,415", chg: "+0.8%", up: true },
                      { name: "SENSEX", val: "73,852", chg: "+1.1%", up: true },
                      { name: "BANK NIFTY", val: "48,120", chg: "-0.3%", up: false },
                      { name: "MIDCAP", val: "44,310", chg: "+0.5%", up: true },
                    ].map(m => (
                      <div key={m.name} className="adm-market-row">
                        <span className="adm-market-name">{m.name}</span>
                        <div>
                          <span className="adm-market-val">{m.val}</span>
                          <span className={`adm-market-chg ${m.up ? "up" : "down"}`}>{m.chg}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === "users" && (
            <div>
              <div className="adm-topbar">
                <div>
                  <div className="adm-page-title">Management</div>
                  <div className="adm-page-heading">Users</div>
                </div>
                <div className="adm-search">
                  <span className="adm-search-icon">⌕</span>
                  <input placeholder="Search users..." />
                </div>
              </div>
              <div className="adm-panel">
                <div className="adm-panel-header">
                  <span className="adm-panel-title">Registered Users</span>
                  <span style={{ fontSize: 11, color: "#4a5568" }}>{users.length} total</span>
                </div>
                <table className="adm-table">
                  <thead><tr><th>User</th><th>Email</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="adm-user-row">
                            <div className="adm-avatar" style={{ color: u.color }}>{u.name[0]}</div>
                            {u.name}
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.joined}</td>
                        <td><span className={`chip ${u.status.toLowerCase()}`}>{u.status}</span></td>
                        <td>
                          <button
                            className={`adm-btn ${u.status === "Active" ? "danger" : "primary"}`}
                            onClick={() => toggleUser(u.id)}
                          >
                            {u.status === "Active" ? "Block" : "Unblock"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <div>
              <div className="adm-topbar">
                <div>
                  <div className="adm-page-title">Transactions</div>
                  <div className="adm-page-heading">Orders</div>
                </div>
                <div className="adm-tab-row">
                  {["all", "buy", "sell"].map(f => (
                    <button key={f} className={`adm-tab${orderFilter === f ? " on" : ""}`} onClick={() => setOrderFilter(f)}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="adm-panel">
                <div className="adm-panel-header"><span className="adm-panel-title">All Orders</span></div>
                <table className="adm-table">
                  <thead><tr><th>Order ID</th><th>User</th><th>Stock</th><th>Exchange</th><th>Qty</th><th>Price</th><th>Type</th><th>Time</th></tr></thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{o.user}</td>
                        <td>{o.stock}</td>
                        <td><span className={`chip ${o.exchange.toLowerCase()}`}>{o.exchange}</span></td>
                        <td>{o.qty}</td>
                        <td>{o.price}</td>
                        <td><span className={`chip ${o.type.toLowerCase()}`}>{o.type}</span></td>
                        <td>{o.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STOCKS */}
          {activeTab === "stocks" && (
            <div>
              <div className="adm-topbar">
                <div>
                  <div className="adm-page-title">Market Data</div>
                  <div className="adm-page-heading">Manage Shares</div>
                </div>
              </div>
              <div className="adm-two-col-sidebar">
                <div className="adm-panel">
                  <div className="adm-panel-header"><span className="adm-panel-title">Listed Shares</span></div>
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead><tr><th>Symbol</th><th>Company ID</th><th>Total Shares</th><th>Price</th><th>Action</th></tr></thead>
                      <tbody>
                        {stocks.map((s, i) => (
                          <tr key={i}>
                            <td>{s.label}</td>
                            <td>{s.companyId}</td>
                            <td>{s.totalShares}</td>
                            <td>{s.price}</td>
                            <td><button className="adm-btn ghost" style={{ fontSize: 9 }}>Edit</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="adm-panel">
                  <div className="adm-panel-header"><span className="adm-panel-title">Add New Share</span></div>
                  <div className="adm-panel-body">
                    {stockSuccess && <div className="adm-success">Share added successfully!</div>}
                    <div className="adm-form">
                      <div className="adm-form-group"><label className="adm-label">Company</label>
                         <select 
                           className="adm-select"
                           value={stockForm.companyId} 
                           onChange={e => setStockForm({ ...stockForm, companyId: e.target.value })}
                         >
                            <option value="">Select Company...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
                         </select>
                      </div>
                      <div className="adm-form-group"><label className="adm-label">Price (₹)</label><input className="adm-input" placeholder="e.g. 7200" type="number" value={stockForm.price} onChange={e => setStockForm({ ...stockForm, price: e.target.value })} /></div>
                      <div className="adm-form-group"><label className="adm-label">Total Shares</label><input className="adm-input" placeholder="e.g. 1000000" type="number" value={stockForm.totalShares} onChange={e => setStockForm({ ...stockForm, totalShares: e.target.value })} /></div>
                      
                      <button className="adm-btn primary-full" onClick={handleAddStock}>+ Add Share</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPANIES */}
          {activeTab === "company" && (
            <div>
              <div className="adm-topbar">
                <div>
                  <div className="adm-page-title">Registry</div>
                  <div className="adm-page-heading">Company Details</div>
                </div>
              </div>
              <div className="adm-two-col-sidebar">
                <div className="adm-panel">
                  <div className="adm-panel-header"><span className="adm-panel-title">Registered Companies</span></div>
                  <table className="adm-table">
                    <thead><tr><th>Company</th><th>Symbol</th><th>Sector</th><th>Action</th></tr></thead>
                    <tbody>
                      {companies.map((c, i) => (
                        <tr key={i}>
                          <td>{c.name}</td>
                          <td style={{ fontSize: 10, color: "#4a5568" }}>{c.symbol}</td>
                          <td>{c.sector}</td>
                          <td>
                            <button 
                                className="adm-btn danger" 
                                style={{fontSize: 9, padding: '4px 8px'}}
                                onClick={() => deleteCompany(c.id)}
                            >
                                Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="adm-panel">
                  <div className="adm-panel-header"><span className="adm-panel-title">Register Company</span></div>
                  <div className="adm-panel-body">
                    {compSuccess && <div className="adm-success">Company registered!</div>}
                    <div className="adm-form">
                      <div className="adm-form-group"><label className="adm-label">Company Name</label><input className="adm-input" placeholder="e.g. Bajaj Finance Ltd." value={compForm.name} onChange={e => setCompForm({ ...compForm, name: e.target.value })} /></div>
                      <div className="adm-form-group"><label className="adm-label">Ticker Symbol</label><input className="adm-input" placeholder="e.g. BAJFINANCE" value={compForm.symbol} onChange={e => setCompForm({ ...compForm, symbol: e.target.value })} /></div>
                      <div className="adm-form-group"><label className="adm-label">Sector</label>
                        <select className="adm-select" value={compForm.sector} onChange={e => setCompForm({ ...compForm, sector: e.target.value })}>
                          <option>Finance</option><option>IT</option><option>Energy</option><option>FMCG</option><option>Pharma</option><option>Auto</option><option>Telecom</option>
                        </select>
                      </div>
                      <div className="adm-form-group"><label className="adm-label">Description</label><textarea className="adm-textarea" placeholder="Brief company overview..." rows={3} value={compForm.desc} onChange={e => setCompForm({ ...compForm, desc: e.target.value })} /></div>
                      <button className="adm-btn primary-full" onClick={handleAddCompany}>+ Register Company</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
