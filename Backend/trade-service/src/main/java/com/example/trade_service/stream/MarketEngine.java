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

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final Random random = new Random();

    @Scheduled(fixedRate = 1000)
    public void updatePrices() {

        companyRepo.findAll().forEach(company -> {

            // ── 1. Get last price ─────────────────────────────────────────────
            double lastPrice = priceCache.getPrice(company.getId());
            if (lastPrice == 0) lastPrice = company.getLastPrice();

            // ── 2. Compute new price (±5% per tick, ±20% day cap) ─────────────
            double percentChange = (random.nextDouble() * 10) - 5;
            double newPrice      = lastPrice + (lastPrice * percentChange / 100);

            double open = company.getOpeningPrice();
            // ── FIX: if openingPrice never set, use lastPrice as open ──────────
            if (open == 0) open = lastPrice;

            double max = open * 1.20;
            double min = open * 0.80;

            if (newPrice > max) newPrice = max;
            if (newPrice < min) newPrice = min;
            newPrice = Math.round(newPrice * 100.0) / 100.0;

            // ── 3. Update cache + buffer ──────────────────────────────────────
            priceCache.updatePrice(company.getId(), newPrice);
            buffer.addPrice(company.getId(), newPrice);

            // ── 4. Compute dayHigh / dayLow ───────────────────────────────────
            // FIX: if dayHigh / dayLow are 0 (new company, never traded),
            // initialise them to newPrice instead of using 0.
            double existingHigh = company.getDayHigh();
            double existingLow  = company.getDayLow();

            double dayHigh = (existingHigh == 0) ? newPrice : Math.max(existingHigh, newPrice);
            double dayLow  = (existingLow  == 0) ? newPrice : Math.min(existingLow,  newPrice);

            // ── 5. Compute % changes ──────────────────────────────────────────
            double dayChangePct  = (open == 0) ? 0.0 : ((newPrice - open) / open) * 100.0;
            double tickChangePct = (lastPrice == 0) ? 0.0 : ((newPrice - lastPrice) / lastPrice) * 100.0;

            // ── 6. Broadcast over WebSocket ───────────────────────────────────
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