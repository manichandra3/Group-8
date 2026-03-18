import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";

import { fetchAllQuotes } from "./stockService";
import "./index.css";
import { useData } from "./context/DataContext";

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

  const items = [...quotes, ...quotes];

  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {items.map((q, i) => (
          <span className="t-item" key={i}>
            <span className="t-sym">{q.label}</span>
            <span className="t-val">
              {q.currency === "INR" ? "₹" : "$"}
              {Number(q.price).toLocaleString("en-IN")}
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

/* ─── Protected Route ─── */
function ProtectedRoute({ children, roleRequired }) {

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roleRequired && role !== roleRequired) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/* ─── Root App ─── */
export default function App() {
  const navigate = useNavigate();
  const { logout } = useData();

  const [quotes, setQuotes] = useState([]);
  const [tickerLoading, setTickerLoading] = useState(true);

  /* Fetch market data */
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
    const interval = setInterval(load, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };

  }, []);

  return (
    <>
      <BgCanvas />

      <TickerBar quotes={quotes} loading={tickerLoading} />

      <div className="page-wrap">

        <Routes>

          {/* LOGIN */}
          <Route
            path="/login"
            element={<Login quotes={quotes} />}
          />

          {/* REGISTER */}
          <Route
            path="/register"
            element={<Register />}
          />

          {/* USER DASHBOARD */}
          {/* USER DASHBOARD */}
          <Route
            path="/home"
            element={
              <ProtectedRoute roleRequired="USER">
                <Home
                  quotes={quotes}
                  onLogout={() => {
                    logout();
                    navigate("/login");
                  }}
                />
              </ProtectedRoute>
            }
          />

          {/* ADMIN DASHBOARD */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roleRequired="ADMIN">
                <AdminDashboard onSignOut={() => {
                  logout();
                  navigate("/login");
                }} />
              </ProtectedRoute>
            }
          />

          {/* DEFAULT */}
          <Route
            path="*"
            element={<Navigate to="/login" />}
          />

        </Routes>

      </div>
    </>
  );
}