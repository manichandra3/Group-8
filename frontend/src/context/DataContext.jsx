import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

// Initial static data (copied from your original Home.jsx)
const initialPortfolio = {
  invested: 248500,
  current: 312840,
  todayPnl: 3420,
  todayPct: 1.11,
  totalPnl: 64340,
  totalPct: 25.89,
};

const initialMFHoldings = [
  { id: 1, name: "Axis Bluechip Fund", type: "Large Cap", invested: 50000, current: 63200, returns: 26.4, rating: 5 },
  { id: 2, name: "Mirae Emerging Bluechip", type: "Mid Cap", invested: 30000, current: 41100, returns: 37.0, rating: 5 },
  { id: 3, name: "HDFC Flexi Cap Fund", type: "Flexi Cap", invested: 40000, current: 49800, returns: 24.5, rating: 4 },
  { id: 4, name: "Parag Parikh Flexi Cap", type: "Flexi Cap", invested: 25000, current: 31200, returns: 24.8, rating: 5 },
];

const initialSIPs = [
  { id: 1, name: "Axis Bluechip Fund", amt: 2000, date: "5th", status: "Active", nextDate: "May 5" },
  { id: 2, name: "Mirae Emerging", amt: 1500, date: "10th", status: "Active", nextDate: "May 10" },
  { id: 3, name: "Parag Parikh Flexi", amt: 3000, date: "15th", status: "Paused", nextDate: "—" },
];

const initialIPOs = [
  { id: 1, name: "TechNova Systems", price: "₹210–₹220", open: "Apr 28", close: "Apr 30", status: "open", gmp: "+₹45" },
  { id: 2, name: "BharatSolar Ltd", price: "₹180–₹195", open: "May 3", close: "May 5", status: "upcoming", gmp: "+₹28" },
  { id: 3, name: "RapidPay Fintech", price: "₹320–₹340", open: "Mar 10", close: "Mar 12", status: "listed", gmp: "₹388" },
  { id: 4, name: "GreenHarvest Agro", price: "₹95–₹100", open: "May 8", close: "May 10", status: "upcoming", gmp: "+₹12" },
];

const initialOrders = [
  { id: 1, sym: "RELIANCE", type: "BUY", qty: 5, price: 2841.0, status: "COMPLETE", time: "10:22 AM" },
  { id: 2, sym: "TCS", type: "SELL", qty: 2, price: 3905.5, status: "COMPLETE", time: "11:05 AM" },
  { id: 3, sym: "INFY", type: "BUY", qty: 10, price: 1495.0, status: "PENDING", time: "1:30 PM" },
  { id: 4, sym: "WIPRO", type: "BUY", qty: 20, price: 445.0, status: "REJECTED", time: "2:10 PM" },
];

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [mfHoldings, setMfHoldings] = useState(initialMFHoldings);
  const [sips, setSips] = useState(initialSIPs);
  const [ipos, setIpos] = useState(initialIPOs);
  const [orders, setOrders] = useState(initialOrders);
  
  // Data fetched from backend
  const [companies, setCompanies] = useState([]);
  const [stocks, setStocks] = useState([]); // This will be 'shares' from backend

  const [token, setToken] = useState(localStorage.getItem("token"));

  // Fetch data on load or when token changes
  useEffect(() => {
    if (token) {
      fetchCompanies();
      fetchShares();
    }
  }, [token]);

  const login = (newToken, newRole, newUsername) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("role", newRole);
    localStorage.setItem("username", newUsername);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setToken(null);
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/companies`, {
          headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error("Failed to fetch companies", err);
    }
  };

  const fetchShares = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shares`, {
          headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Transform backend share data to frontend stock format
        const transformed = data.map(share => ({
          id: share.id,
          label: share.companySymbol,
          price: share.pricePerShare,
          changePct: 0.0, // Backend doesn't have daily change yet
          up: true,
          companyId: share.companyId,
          totalShares: share.totalShares
        }));
        setStocks(transformed);
      }
    } catch (err) {
      console.error("Failed to fetch shares", err);
    }
  };

  // CRUD for Companies
  const addCompany = async (newCompany) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/companies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newCompany)
      });
      if (res.ok) {
        fetchCompanies();
      }
    } catch (err) {
      console.error("Failed to add company", err);
    }
  };

  const updateCompany = async (id, updated) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/companies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        fetchCompanies();
      }
    } catch (err) {
      console.error("Failed to update company", err);
    }
  };

  const deleteCompany = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/companies/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchCompanies();
      }
    } catch (err) {
      console.error("Failed to delete company", err);
    }
  };

  // CRUD for Shares (Stocks)
  const addStock = async (newShare) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shares`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            companyId: newShare.companyId,
            totalShares: newShare.totalShares,
            pricePerShare: newShare.price
        })
      });
      if (res.ok) {
        fetchShares();
      }
    } catch (err) {
      console.error("Failed to add share", err);
    }
  };

  const updateStock = async (id, updated) => {
    try {
      // Backend expects ShareUpdateRequest: { pricePerShare, availableShares }
      const payload = {
          pricePerShare: updated.price,
          // We don't expose availableShares in frontend edit yet, so maybe keep it or default
          // For now, let's assume we are updating price. 
          // If we need to update companyId or totalShares, backend API might need adjustment or we use different endpoint.
          // Based on ShareController, PUT /api/shares/{id} takes ShareUpdateRequest
      };
      
      const res = await fetch(`${API_BASE_URL}/api/shares/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchShares();
      }
    } catch (err) {
      console.error("Failed to update share", err);
    }
  };

  const deleteStock = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shares/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchShares();
      }
    } catch (err) {
      console.error("Failed to delete share", err);
    }
  };

  // Keep other local state for now
  const addMF = (newMF) => {
    setMfHoldings(prev => [...prev, { ...newMF, id: Date.now() }]);
  };
  const updateMF = (id, updated) => {
    setMfHoldings(prev => prev.map(m => m.id === id ? { ...m, ...updated } : m));
  };
  const deleteMF = (id) => {
    setMfHoldings(prev => prev.filter(m => m.id !== id));
  };

  const addSIP = (newSIP) => {
    setSips(prev => [...prev, { ...newSIP, id: Date.now() }]);
  };
  const updateSIP = (id, updated) => {
    setSips(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };
  const deleteSIP = (id) => {
    setSips(prev => prev.filter(s => s.id !== id));
  };

  const addIPO = (newIPO) => {
    setIpos(prev => [...prev, { ...newIPO, id: Date.now() }]);
  };
  const updateIPO = (id, updated) => {
    setIpos(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
  };
  const deleteIPO = (id) => {
    setIpos(prev => prev.filter(i => i.id !== id));
  };

  const addOrder = (newOrder) => {
    setOrders(prev => [...prev, { ...newOrder, id: Date.now() }]);
  };
  const updateOrder = (id, updated) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
  };
  const deleteOrder = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  return (
    <DataContext.Provider value={{
      portfolio, setPortfolio,
      mfHoldings, addMF, updateMF, deleteMF,
      sips, addSIP, updateSIP, deleteSIP,
      ipos, addIPO, updateIPO, deleteIPO,
      orders, addOrder, updateOrder, deleteOrder,
      stocks, addStock, updateStock, deleteStock,
      companies, addCompany, updateCompany, deleteCompany,
      login, logout
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
