import { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./pages/Home";
import "./index.css";

// ── Animated ticker data ──
const STOCKS = [
  { sym: "RELIANCE", val: "₹2,847", chg: "+1.24%" },
  { sym: "TCS",      val: "₹3,921", chg: "-0.43%" },
  { sym: "INFY",     val: "₹1,502", chg: "+0.87%" },
  { sym: "HDFCBANK", val: "₹1,623", chg: "-1.12%" },
  { sym: "WIPRO",    val: "₹448",   chg: "+2.01%" },
  { sym: "NIFTY50",  val: "22,543", chg: "+0.56%" },
  { sym: "SENSEX",   val: "74,231", chg: "+0.38%" },
  { sym: "ADANI",    val: "₹2,109", chg: "-0.91%" },
  { sym: "ITC",      val: "₹437",   chg: "+0.65%" },
  { sym: "BAJFIN",   val: "₹6,782", chg: "+1.30%" },
];

function Ticker() {
  const items = [...STOCKS, ...STOCKS]; // doubled for seamless loop
  return (
    <div className="ticker-container">
      <div className="ticker-track">
        {items.map((s, i) => (
          <span className="ticker-item" key={i}>
            <span className="sym">{s.sym}</span>
            {s.val}{" "}
            <span className={s.chg.startsWith("+") ? "up" : "down"}>
              {s.chg.startsWith("+") ? "▲" : "▼"} {s.chg}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function AuroraBg() {
  return (
    <div className="aurora-bg">
      <div className="aurora-orb" />
      <div className="aurora-orb" />
      <div className="aurora-orb" />
      <div className="aurora-orb" />
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [showLogin, setShowLogin]     = useState(true);
  const [username, setUsername]       = useState("");

  const handleLoginSuccess = (user) => {
    setUsername(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setShowLogin(true);
  };

  return (
    <>
      <AuroraBg />
      <div className="grid-overlay" />
      <Ticker />

      <div className="app-wrapper">
        {isLoggedIn ? (
          <Home username={username} onLogout={handleLogout} />
        ) : showLogin ? (
          <Login
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

export default App;