// src/hooks/useExchange.js
// Connects to trade_service on port 8083

import { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

export const TRADE_API = axios.create({ baseURL: "http://localhost:8083" });

const WS_URL       = "http://localhost:8083/ws";
const SNAPSHOT_URL = "http://localhost:8083/api/prices/snapshot";
const MAX_HISTORY  = 60;

export function useExchange() {
  const liveMapRef = useRef({});
  const stompRef   = useRef(null);
  const [tickCount,  setTickCount]  = useState(0);
  const [connected,  setConnected]  = useState(false);

  const seedFromSnapshot = useCallback(async () => {
    try {
      const res = await axios.get(SNAPSHOT_URL);
      res.data.forEach(tick => {
        const id = tick.companyId;
        if (!liveMapRef.current[id]) {
          liveMapRef.current[id] = {
            companyId:     id,
            companyName:   tick.companyName,
            price:         tick.price,
            open:          tick.open,
            high:          tick.high,
            low:           tick.low,
            dayChangePct:  tick.dayChangePct,
            tickChangePct: 0,
            history:       [tick.price],
          };
        }
      });
      setTickCount(c => c + 1);
    } catch (e) {
      console.warn("[Exchange] Snapshot failed:", e.message);
    }
  }, []);

  const connect = useCallback(() => {
    if (stompRef.current?.active) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/prices", (message) => {
          try {
            const tick = JSON.parse(message.body);
            const id   = tick.companyId;
            const prev = liveMapRef.current[id];
            const history = prev?.history ? [...prev.history, tick.price] : [tick.price];
            if (history.length > MAX_HISTORY) history.shift();
            liveMapRef.current[id] = {
              companyId:     id,
              companyName:   tick.companyName,
              price:         tick.price,
              open:          tick.open,
              high:          tick.high,
              low:           tick.low,
              dayChangePct:  tick.dayChangePct,
              tickChangePct: tick.tickChangePct,
              history,
            };
            setTickCount(c => c + 1);
          } catch (err) { console.error("[Exchange] Tick parse error:", err); }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (f) => console.error("[Exchange] STOMP error:", f.headers?.message),
    });
    client.activate();
    stompRef.current = client;
  }, []);

  useEffect(() => {
    seedFromSnapshot().then(() => connect());
    return () => stompRef.current?.deactivate();
  }, [seedFromSnapshot, connect]);

  return { liveMap: liveMapRef.current, connected, tickCount };
}