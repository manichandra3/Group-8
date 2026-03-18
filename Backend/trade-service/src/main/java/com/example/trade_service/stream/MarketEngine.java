package com.example.trade_service.stream;

import com.example.trade_service.domain.Company;
import com.example.trade_service.dto.PriceTick;
import com.example.trade_service.repository.CompanyRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
public class MarketEngine {

    @Autowired
    private CompanyRepository companyRepo;

    @Autowired
    private PriceCache priceCache;

    @Autowired
    private PriceBuffer buffer;

    // ── NEW: injected to broadcast price ticks over WebSocket ────────────────
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final Random random = new Random();

    @Scheduled(fixedRate = 1000)
    public void updatePrices() {

        companyRepo.findAll().forEach(company -> {

            // ── 1. Get last price from cache (same as before) ─────────────────
            double lastPrice = priceCache.getPrice(company.getId());
            if (lastPrice == 0) {
                lastPrice = company.getLastPrice();
            }

            // ── 2. Compute new price (same logic as before) ───────────────────
            //    Random walk: uniform ±5% per tick
            //    (your original code used ±5% — (random * 10) - 5 = ±5%)
            double percentChange = (random.nextDouble() * 10) - 5;
            double newPrice      = lastPrice + (lastPrice * percentChange / 100);

            // ── 3. Hard-clamp to ±20% of day open (same as before) ────────────
            double open = company.getOpeningPrice();
            double max  = open * 1.20;
            double min  = open * 0.80;

            if (newPrice > max) newPrice = max;
            if (newPrice < min) newPrice = min;

            newPrice = Math.round(newPrice * 100.0) / 100.0;

            // ── 4. Update cache + buffer (same as before) ─────────────────────
            priceCache.updatePrice(company.getId(), newPrice);
            buffer.addPrice(company.getId(), newPrice);

            // ── 5. NEW: compute derived fields and broadcast ──────────────────

            // dayHigh / dayLow — update in-memory on company (not saved to DB
            // yet — CompanyBatchUpdater handles DB flush every 10s as before)
            double dayHigh = Math.max(company.getDayHigh(), newPrice);
            double dayLow  = company.getDayLow() == 0
                    ? newPrice
                    : Math.min(company.getDayLow(), newPrice);

            // Write back so the next tick sees the updated values
            company.setDayHigh(dayHigh);
            company.setDayLow(dayLow);

            // % change from day open  (already constrained ±20% by the clamp above)
            double dayChangePct = open == 0 ? 0
                    : ((newPrice - open) / open) * 100.0;

            // % change from previous tick
            double tickChangePct = lastPrice == 0 ? 0
                    : ((newPrice - lastPrice) / lastPrice) * 100.0;

            // Build tick payload and send to all subscribers of /topic/prices
            PriceTick tick = new PriceTick(
                    company.getId(),
                    company.getName(),
                    newPrice,
                    open,
                    dayHigh,
                    dayLow,
                    dayChangePct,
                    tickChangePct
            );

            messagingTemplate.convertAndSend("/topic/prices", tick);
        });
    }
}