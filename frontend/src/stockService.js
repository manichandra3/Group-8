// ─────────────────────────────────────────────────────────────────────────────
// stockService.js
// Fetches real-time quotes from Yahoo Finance via allorigins CORS proxy.
// No API key required. Free & frontend-only.
// ─────────────────────────────────────────────────────────────────────────────

// Indian NSE tickers use ".NS" suffix on Yahoo Finance
// Global tickers use their standard symbols
export const TICKER_LIST = [
  { sym: "RELIANCE.NS", label: "RELIANCE" },
  { sym: "TCS.NS",      label: "TCS"      },
  { sym: "INFY.NS",     label: "INFY"     },
  { sym: "HDFCBANK.NS", label: "HDFCBANK" },
  { sym: "WIPRO.NS",    label: "WIPRO"    },
  { sym: "ITC.NS",      label: "ITC"      },
  { sym: "BAJFINANCE.NS", label: "BAJFIN" },
  { sym: "^NSEI",       label: "NIFTY 50" },
  { sym: "^BSESN",      label: "SENSEX"   },
  { sym: "ADANIENT.NS", label: "ADANI"    },
];

const CORS_PROXY = "https://api.allorigins.win/get?url=";

/**
 * Fetch a single ticker's quote from Yahoo Finance v8 chart API.
 * Returns { label, price, change, changePct, currency, up }
 */
async function fetchQuote(sym, label) {
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`;
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(yahooUrl)}`;

  const res  = await fetch(proxyUrl);
  const json = await res.json();
  const body = JSON.parse(json.contents);

  const meta   = body?.chart?.result?.[0]?.meta;
  const price  = meta?.regularMarketPrice ?? 0;
  const prev   = meta?.previousClose ?? meta?.chartPreviousClose ?? price;
  const change = price - prev;
  const pct    = prev ? (change / prev) * 100 : 0;
  const currency = meta?.currency ?? "INR";

  return {
    label,
    sym,
    price:     price.toFixed(2),
    change:    change.toFixed(2),
    changePct: pct.toFixed(2),
    currency,
    up: change >= 0,
  };
}

/**
 * Fetch all tickers concurrently. Returns array of quote objects.
 * Falls back to null for any that fail.
 */
export async function fetchAllQuotes() {
  const results = await Promise.allSettled(
    TICKER_LIST.map(({ sym, label }) => fetchQuote(sym, label))
  );
  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean);
}