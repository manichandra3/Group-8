// src/stockService.js
//
// Fetches real Indian market quotes for the App.jsx ticker tape.
//
// Strategy:
//   1. Try corsproxy.io  (free, reliable)
//   2. Try api.codetabs.com proxy
//   3. Fall back to static placeholder data so the app never crashes
//
// If ALL proxies fail (common in dev), placeholder data is returned silently.
// The ticker tape will show static values — not ideal but never broken.

const SYMBOLS = [
  { symbol: "^BSESN",   label: "SENSEX",    currency: "INR" },
  { symbol: "^NSEI",    label: "NIFTY 50",  currency: "INR" },
  { symbol: "^NSEBANK", label: "BANKNIFTY", currency: "INR" },
  { symbol: "RELIANCE.NS", label: "RELIANCE", currency: "INR" },
  { symbol: "TCS.NS",   label: "TCS",       currency: "INR" },
  { symbol: "HDFCBANK.NS", label: "HDFCBANK", currency: "INR" },
  { symbol: "INFY.NS",  label: "INFY",      currency: "INR" },
  { symbol: "WIPRO.NS", label: "WIPRO",     currency: "INR" },
];

// Static fallback shown when all proxies fail
const STATIC_FALLBACK = [
  { label:"SENSEX",    price: 73852, changePct: 1.1,  up: true,  currency:"INR" },
  { label:"NIFTY 50",  price: 22415, changePct: 0.8,  up: true,  currency:"INR" },
  { label:"BANKNIFTY", price: 48120, changePct: -0.3, up: false, currency:"INR" },
  { label:"RELIANCE",  price: 2942,  changePct: 1.2,  up: true,  currency:"INR" },
  { label:"TCS",       price: 3810,  changePct: -0.4, up: false, currency:"INR" },
  { label:"HDFCBANK",  price: 1680,  changePct: -1.1, up: false, currency:"INR" },
  { label:"INFY",      price: 1522,  changePct: 0.7,  up: true,  currency:"INR" },
  { label:"WIPRO",     price: 492,   changePct: 0.3,  up: true,  currency:"INR" },
];

// ── Yahoo Finance URL builder ──────────────────────────────────────────────
function yahooUrl(symbol) {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
}

// ── Proxy wrappers ─────────────────────────────────────────────────────────
async function viaCorsproxy(symbol) {
  const target = encodeURIComponent(yahooUrl(symbol));
  const res    = await fetch(`https://corsproxy.io/?${target}`, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`corsproxy ${res.status}`);
  return res.json();
}

async function viaCodetabs(symbol) {
  const target = encodeURIComponent(yahooUrl(symbol));
  const res    = await fetch(`https://api.codetabs.com/v1/proxy?quest=${target}`, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`codetabs ${res.status}`);
  return res.json();
}

// ── Parse Yahoo response → { label, price, changePct, up, currency } ──────
function parseYahoo(data, label, currency) {
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("empty result");

  const meta       = result.meta;
  const price      = meta.regularMarketPrice ?? meta.previousClose;
  const prevClose  = meta.previousClose || meta.chartPreviousClose || price;
  const changePct  = ((price - prevClose) / prevClose) * 100;

  if (!price || isNaN(price)) throw new Error("no price");

  return {
    label,
    price:     Math.round(price * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    up:        changePct >= 0,
    currency,
  };
}

// ── Fetch a single symbol with proxy fallback chain ────────────────────────
async function fetchOne({ symbol, label, currency }) {
  // Try proxy 1
  try {
    const data = await viaCorsproxy(symbol);
    return parseYahoo(data, label, currency);
  } catch (_) { /* try next */ }

  // Try proxy 2
  try {
    const data = await viaCodetabs(symbol);
    return parseYahoo(data, label, currency);
  } catch (_) { /* give up */ }

  // Return null — caller will use static fallback
  return null;
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function fetchAllQuotes() {
  try {
    // Fetch all symbols in parallel, timeout the whole batch at 10s
    const results = await Promise.race([
      Promise.allSettled(SYMBOLS.map(s => fetchOne(s))),
      new Promise((_, reject) => setTimeout(() => reject(new Error("batch timeout")), 10000)),
    ]);

    // Keep successful fetches
    const live = results
      .filter(r => r.status === "fulfilled" && r.value !== null)
      .map(r => r.value);

    if (live.length >= 3) {
      // Enough live data — use it, fill missing with static
      const liveLabels = new Set(live.map(q => q.label));
      const missing    = STATIC_FALLBACK.filter(s => !liveLabels.has(s.label));
      return [...live, ...missing];
    }

    // Not enough live data — use all static
    console.info("[stockService] Using static fallback (proxies unavailable)");
    return STATIC_FALLBACK;

  } catch (_) {
    console.info("[stockService] Using static fallback (batch failed)");
    return STATIC_FALLBACK;
  }
}