import { API_BASE_URL } from "./config";

// ─────────────────────────────────────────────────────────────────────────────
// stockService.js
// Fetches share data from the internal backend API.
// ─────────────────────────────────────────────────────────────────────────────

export const getShareHistory = async (id) => {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/shares/${id}/history`, {
            headers
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Error fetching share history:", e);
        return [];
    }
};

/**
 * Fetch all shares from the backend.
 * Returns array of quote objects compatible with the UI.
 */
export async function fetchAllQuotes() {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/shares`, { headers });
    if (!res.ok) throw new Error("Failed to fetch shares");
    
    const shares = await res.json();
    
    return shares.map(share => ({
      id: share.id, // Keep the ID for navigation/history
      sym: share.companySymbol,
      label: share.companyName,
      price: Number(share.pricePerShare).toFixed(2),
      change: "0.00", // Backend doesn't provide daily change yet
      changePct: "0.00",
      currency: "INR",
      up: true
    }));
  } catch (e) {
    console.error("Error fetching quotes:", e);
    return [];
  }
}