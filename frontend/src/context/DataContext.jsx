import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolioId, setActivePortfolioId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [users, setUsers] = useState([]);
  const [marketLoading, setMarketLoading] = useState(false);

  const [token, setToken] = useState(localStorage.getItem("token"));

  const authHeaders = (includeJson = false) => {
    const headers = {};
    if (includeJson) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    if (token) {
      fetchCompanies();
      fetchShares();
      fetchPortfolios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token && activePortfolioId) {
      fetchTransactions(activePortfolioId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activePortfolioId]);

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
    setCompanies([]);
    setStocks([]);
    setPortfolios([]);
    setTransactions([]);
    setActivePortfolioId(null);
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/companies`, {
        headers: authHeaders()
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
    setMarketLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shares`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const transformed = data.map(share => ({
          id: share.id,
          label: share.companySymbol,
          companyName: share.companyName,
          price: share.pricePerShare,
          change: 0,
          changePct: 0,
          up: true,
          companyId: share.companyId,
          totalShares: share.totalShares,
          availableShares: share.availableShares,
          currency: "INR"
        }));
        setStocks(transformed);
      }
    } catch (err) {
      console.error("Failed to fetch shares", err);
    } finally {
      setMarketLoading(false);
    }
  };

  const fetchPortfolios = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/portfolios`, {
        headers: authHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setPortfolios(data);

        if (data.length > 0) {
          const portfolioId = activePortfolioId ?? data[0].id;
          setActivePortfolioId(portfolioId);
          fetchTransactions(portfolioId);
        } else {
          setActivePortfolioId(null);
          setTransactions([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch portfolios", err);
    }
  };

  const fetchTransactions = async (portfolioId) => {
    if (!portfolioId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions/portfolio/${portfolioId}`, {
        headers: authHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    }
  };

  // CRUD for Companies
  const addCompany = async (newCompany) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/companies`, {
        method: "POST",
        headers: authHeaders(true),
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
        headers: authHeaders(true),
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
        headers: authHeaders()
      });
      if (res.ok) {
        fetchCompanies();
      }
    } catch (err) {
      console.error("Failed to delete company", err);
    }
  };

  // CRUD for Users
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: authHeaders()
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const deleteUser = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  const updateUser = async (id, updated) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
            method: "PUT",
            headers: authHeaders(true),
            body: JSON.stringify(updated)
        });
        if (res.ok) {
            fetchUsers();
        }
      } catch (err) {
          console.error("Failed to update user", err);
      }
  };

  // CRUD for Shares (Stocks)
  const addStock = async (newShare) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shares`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
            companyId: newShare.companyId,
            totalShares: newShare.totalShares,
            availableShares: newShare.totalShares,
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
          totalShares: Number(updated.totalShares || 1),
          availableShares: Number(updated.availableShares ?? updated.totalShares ?? 0),
          pricePerShare: Number(updated.price || 0)
      };
      
      const res = await fetch(`${API_BASE_URL}/api/shares/${id}`, {
        method: "PUT",
        headers: authHeaders(true),
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
        headers: authHeaders()
      });
      if (res.ok) {
        fetchShares();
      }
    } catch (err) {
      console.error("Failed to delete share", err);
    }
  };

  const activePortfolio = useMemo(
    () => portfolios.find((p) => p.id === activePortfolioId) || portfolios[0] || null,
    [portfolios, activePortfolioId]
  );

  const portfolio = useMemo(() => {
    if (!activePortfolio) {
      return {
        invested: 0,
        current: 0,
        todayPnl: 0,
        todayPct: 0,
        totalPnl: 0,
        totalPct: 0,
      };
    }

    const priceBySymbol = new Map(stocks.map((s) => [s.label, Number(s.price) || 0]));

    let invested = 0;
    let current = 0;

    (activePortfolio.holdings || []).forEach((h) => {
      const qty = Number(h.quantity) || 0;
      const avgPrice = Number(h.averagePrice) || 0;
      const lastPrice = priceBySymbol.get(h.companySymbol) ?? avgPrice;

      invested += Number(h.totalInvestment) || qty * avgPrice;
      current += qty * lastPrice;
    });

    const totalPnl = current - invested;
    const totalPct = invested > 0 ? (totalPnl / invested) * 100 : 0;

    return {
      invested,
      current,
      todayPnl: 0,
      todayPct: 0,
      totalPnl,
      totalPct,
    };
  }, [activePortfolio, stocks]);

  const orders = useMemo(
    () => (transactions || []).map((t) => ({
      id: t.id,
      sym: t.companySymbol,
      type: t.transactionType,
      qty: t.quantity,
      price: Number(t.pricePerShare) || 0,
      status: "COMPLETE",
      timestamp: t.transactionDate || null,
      time: t.transactionDate
        ? new Date(t.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : "--:--",
    })),
    [transactions]
  );

  const addOrder = async (newOrder) => {
    if (!activePortfolio?.id) {
      console.warn("No active portfolio selected");
      return;
    }

    const type = String(newOrder.type || "BUY").toUpperCase();
    const endpoint = type === "SELL" ? "sell" : "buy";
    const payload = {
      portfolioId: activePortfolio.id,
      companySymbol: newOrder.sym || newOrder.companySymbol,
      quantity: Number(newOrder.qty || newOrder.quantity || 0),
      pricePerShare: Number(newOrder.price || newOrder.pricePerShare || 0),
    };

    if (!payload.companySymbol || payload.quantity <= 0 || payload.pricePerShare <= 0) {
      console.warn("Invalid order payload", payload);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions/${endpoint}`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchPortfolios();
      }
    } catch (err) {
      console.error("Failed to place order", err);
    }
  };

  const updateOrder = () => {
    console.warn("Order update API is not available in backend");
  };

  const deleteOrder = () => {
    console.warn("Order delete API is not available in backend");
  };

  return (
    <DataContext.Provider value={{
      token,
      marketLoading,
      portfolio,
      portfolios,
      activePortfolio,
      activePortfolioId,
      setActivePortfolioId,
      refreshPortfolioData: fetchPortfolios,
      orders, addOrder, updateOrder, deleteOrder,
      stocks, addStock, updateStock, deleteStock,
      companies, addCompany, updateCompany, deleteCompany,
      users, fetchUsers, updateUser, deleteUser,
      login, logout
    }}>
      {children}
    </DataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => useContext(DataContext);
