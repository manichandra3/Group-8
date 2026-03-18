// src/hooks/useExchange.js
// KEY FIX: liveMap is now STATE (not a ref) so React re-renders on every tick.
// Previously components read a stale ref and never saw updates.

import { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

export const TRADE_API = axios.create({ baseURL: "http://localhost:8083" });

const WS_URL       = "http://localhost:8083/ws";
const SNAPSHOT_URL = "http://localhost:8083/api/prices/snapshot";
const MAX_HISTORY  = 60;

export function normName(n = "") {
  return n.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sanitise(tick) {
  const price = Number(tick.price)  || 0;
  const open  = Number(tick.open)   || price;
  const high  = Number(tick.high) > 0 ? Number(tick.high) : price;
  const low   = Number(tick.low)  > 0 ? Number(tick.low)  : price;
  return {
    companyId:     tick.companyId,
    companyName:   tick.companyName,
    price, open, high, low,
    dayChangePct:  Number(tick.dayChangePct)  || 0,
    tickChangePct: Number(tick.tickChangePct) || 0,
  };
}

/**
 * Look up live data for a stock-service company object.
 * Tries: exact ID → exact name → prefix partial name.
 */
export function getLive(liveMap, company) {
  if (!liveMap || !company) return null;

  // 1. Direct ID match
  if (liveMap[company.id]) return liveMap[company.id];

  // 2. Exact normalized name
  const needle  = normName(company.name);
  const entries = Object.values(liveMap);

  const exact = entries.find(e => normName(e.companyName) === needle);
  if (exact) return exact;

  // 3. Prefix partial match — min 4 chars to avoid false positives
  return entries.find(e => {
    const hay = normName(e.companyName);
    return hay.length >= 4 && (needle.startsWith(hay) || hay.startsWith(needle));
  }) || null;
}

export function useExchange() {
  // liveMap is STATE so React re-renders when it changes
  const [liveMap,   setLiveMap]   = useState({});
  const [connected, setConnected] = useState(false);

  // Mutable internal map — batch updates here, flush to state each tick
  const mapRef   = useRef({});
  const stompRef = useRef(null);

  const flush = useCallback(() => {
    setLiveMap({ ...mapRef.current }); // new reference = React re-renders
  }, []);

  const seedFromSnapshot = useCallback(async () => {
    try {
      const res = await axios.get(SNAPSHOT_URL);
      res.data.forEach(raw => {
        const id   = raw.companyId;
        const tick = sanitise(raw);
        if (!mapRef.current[id]) {
          mapRef.current[id] = { ...tick, history: [tick.price] };
        }
      });
      flush();
      console.log(`[Exchange] Seeded ${res.data.length} companies`);
    } catch (e) {
      console.warn("[Exchange] Snapshot failed:", e.message);
    }
  }, [flush]);

  const connect = useCallback(() => {
    if (stompRef.current?.active) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,

      onConnect: () => {
        setConnected(true);
        console.log("[Exchange] WebSocket connected");

        client.subscribe("/topic/prices", (message) => {
          try {
            const raw  = JSON.parse(message.body);
            const id   = raw.companyId;
            const tick = sanitise(raw);
            const prev = mapRef.current[id];

            const history = prev?.history
              ? [...prev.history, tick.price]
              : [tick.price];
            if (history.length > MAX_HISTORY) history.shift();

            mapRef.current[id] = {
              ...tick,
              high:    Math.max(prev?.high || tick.price, tick.high, tick.price),
              low:     Math.min(prev?.low  || tick.price, tick.low,  tick.price),
              history,
            };

            flush(); // triggers React re-render
          } catch (err) {
            console.error("[Exchange] Tick parse error:", err);
          }
        });
      },

      onDisconnect: () => {
        setConnected(false);
        console.log("[Exchange] Disconnected — retrying");
      },

      onStompError: (f) => console.error("[Exchange] STOMP error:", f.headers?.message),
    });

    client.activate();
    stompRef.current = client;
  }, [flush]);

  useEffect(() => {
    seedFromSnapshot().then(() => connect());
    return () => stompRef.current?.deactivate();
  }, [seedFromSnapshot, connect]);

  return { liveMap, connected };
}