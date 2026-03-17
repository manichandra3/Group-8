import { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./pages/Home";
import { fetchAllQuotes } from "./stockService";
import "./index.css";

/* ─── Background layers ─── */
function BgCanvas() {
  return (
    <>
      <div className="bg-canvas">
        <div className="bg-orb orb-a" />
        <div className="bg-orb orb-b" />
        <div className="bg-orb orb-c" />
        <div className="bg-orb orb-d" />
      </div>
      <div className="bg-grid" />
      <div className="bg-beam" />
    </>
  );
}

/* ─── Live Ticker Strip ─── */
function TickerBar({ quotes, loading }) {
  if (loading) {
    return (
      <div className="ticker-bar">
        <span className="t-loading">⟳ Fetching live market data…</span>
      </div>
    );
  }

  // Duplicate array for seamless infinite scroll
  const items = [...quotes, ...quotes];

  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {items.map((q, i) => (
          <span className="t-item" key={i}>
            <span className="t-sym">{q.label}</span>
            <span className="t-val">
              {q.currency === "INR" ? "₹" : "$"}{Number(q.price).toLocaleString("en-IN")}
            </span>
            <span className={q.up ? "t-up" : "t-dn"}>
              {q.up ? "▲" : "▼"} {Math.abs(q.changePct)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Root App ─── */
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin,  setShowLogin]  = useState(true);
  const [username,   setUsername]   = useState("");
  const [quotes,     setQuotes]     = useState([]);
  const [tickerLoading, setTickerLoading] = useState(true);

  // Fetch real quotes on mount and every 60 seconds
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchAllQuotes();
        if (mounted && data.length > 0) {
          setQuotes(data);
          setTickerLoading(false);
        }
      } catch {
        if (mounted) setTickerLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const handleLoginSuccess = (user) => { setUsername(user); setIsLoggedIn(true); };
  const handleLogout = () => { setIsLoggedIn(false); setUsername(""); setShowLogin(true); };

  return (
    <>
      <BgCanvas />
      <TickerBar quotes={quotes} loading={tickerLoading} />

      <div className="page-wrap">
        {isLoggedIn ? (
          <Home username={username} quotes={quotes} onLogout={handleLogout} />
        ) : showLogin ? (
          <Login
            quotes={quotes}
            onLoginSuccess={handleLoginSuccess}
            setShowLogin={setShowLogin}
          />
        ) : (
          <Register setShowLogin={setShowLogin} />
        )}
      </div>
    </>
  );
}