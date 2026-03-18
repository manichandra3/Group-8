// src/hooks/useExchange.js
//
// Manages the full lifecycle of the WebSocket price feed:
//   1. Fetches /api/prices/snapshot on mount   → seeds liveMap with current prices
//   2. Connects to ws://localhost:8082/ws       → subscribes to /topic/prices
//   3. Each incoming PriceTick updates liveMap  → triggers re-render in consumers
//   4. Reconnects automatically on disconnect
//   5. Cleans up on unmount

import { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8082/api" });

const MAX_HISTORY = 40; // rolling sparkline window

/**
 * @returns {object} liveMap  — { [shareId]: { price, open, high, low, dayChangePct, tickChangePct, history } }
 * @returns {boolean} connected — whether WS is currently connected
 * @returns {number}  tickCount — increments on every tick (use as dependency to trigger re-renders)
 */
export function useExchange() {
  // liveMap is stored in a ref so the STOMP callback always has the latest
  // version without needing to be recreated (avoids stale closure bug)
  const liveMapRef  = useRef({});
  const stompRef    = useRef(null);

  const [tickCount,  setTickCount]  = useState(0);
  const [connected,  setConnected]  = useState(false);

  // ── 1. Seed from REST snapshot ─────────────────────────────────────────────
  const seedFromSnapshot = useCallback(async () => {
    try {
      const res = await API.get("/prices/snapshot");
      // snapshot returns { shareId: currentPrice, ... }
      const map = res.data;
      Object.entries(map).forEach(([id, price]) => {
        const p = parseFloat(price);
        const sid = parseInt(id, 10);
        if (!liveMapRef.current[sid]) {
          liveMapRef.current[sid] = {
            price:         p,
            open:          p,
            high:          p,
            low:           p,
            dayChangePct:  0,
            tickChangePct: 0,
            history:       [p],
          };
        }
      });
      setTickCount(c => c + 1);
    } catch (e) {
      console.warn("Price snapshot fetch failed — will rely on WS ticks:", e);
    }
  }, []);

  // ── 2. Connect STOMP over SockJS ──────────────────────────────────────────
  const connect = useCallback(() => {
    if (stompRef.current?.active) return;

    const client = new Client({
      // SockJS factory — lets STOMP use SockJS as its transport
      webSocketFactory: () => new SockJS("http://localhost:8082/ws"),

      reconnectDelay: 5000,       // auto-reconnect every 5s if disconnected

      onConnect: () => {
        setConnected(true);
        console.log("[Exchange] WebSocket connected");

        // ── Subscribe to price feed ──────────────────────────────────────
        client.subscribe("/topic/prices", (message) => {
          try {
            const tick = JSON.parse(message.body);
            // tick shape: { shareId, price, open, high, low, dayChangePct, tickChangePct }

            const sid   = tick.shareId;
            const price = parseFloat(tick.price);
            const prev  = liveMapRef.current[sid];

            // Build rolling history
            const history = prev?.history ? [...prev.history, price] : [price];
            if (history.length > MAX_HISTORY) history.shift();

            liveMapRef.current[sid] = {
              price,
              open:          parseFloat(tick.open),
              high:          parseFloat(tick.high),
              low:           parseFloat(tick.low),
              dayChangePct:  tick.dayChangePct,
              tickChangePct: tick.tickChangePct,
              history,
            };

            // Trigger React re-render
            setTickCount(c => c + 1);
          } catch (err) {
            console.error("[Exchange] Tick parse error:", err);
          }
        });
      },

      onDisconnect: () => {
        setConnected(false);
        console.log("[Exchange] WebSocket disconnected");
      },

      onStompError: (frame) => {
        console.error("[Exchange] STOMP error:", frame);
      },
    });

    client.activate();
    stompRef.current = client;
  }, []);

  // ── 3. Lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    seedFromSnapshot().then(() => connect());

    return () => {
      stompRef.current?.deactivate();
    };
  }, [seedFromSnapshot, connect]);

  return {
    liveMap:  liveMapRef.current,  // NOT reactive itself — use tickCount to trigger renders
    connected,
    tickCount,
  };
}