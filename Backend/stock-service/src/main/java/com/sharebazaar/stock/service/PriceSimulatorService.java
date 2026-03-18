package com.sharebazaar.stock.service;

import com.sharebazaar.stock.domain.Share;
import com.sharebazaar.stock.dto.PriceTick;
import com.sharebazaar.stock.repository.ShareRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simulates real-time price movement for every share.
 *
 * Constraints:
 *   - Per tick  : price cannot move more than ±5%  from the previous tick price
 *   - Per day   : price cannot move more than ±20% from the day's opening price
 *
 * Broadcasts a PriceTick to /topic/prices every 3 seconds.
 */
@Service
public class PriceSimulatorService {

    private static final Logger log = LoggerFactory.getLogger(PriceSimulatorService.class);

    // ── Constraints ────────────────────────────────────────────────────────────
    private static final double MAX_TICK_FRACTION = 0.05;  // ±5%  per tick
    private static final double MAX_DAY_FRACTION  = 0.20;  // ±20% per day

    // ── State (in-memory, resets on restart) ──────────────────────────────────
    // key = shareId
    private final Map<Long, BigDecimal> currentPrice = new ConcurrentHashMap<>();
    private final Map<Long, BigDecimal> openPrice    = new ConcurrentHashMap<>();
    private final Map<Long, BigDecimal> dayHigh      = new ConcurrentHashMap<>();
    private final Map<Long, BigDecimal> dayLow       = new ConcurrentHashMap<>();

    private final Random random = new Random();

    private final ShareRepository         shareRepository;
    private final SimpMessagingTemplate   messagingTemplate;

    public PriceSimulatorService(ShareRepository shareRepository,
                                 SimpMessagingTemplate messagingTemplate) {
        this.shareRepository   = shareRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Seed the simulator with current DB prices on startup.
     * These become the "day open" prices.
     */
    @PostConstruct
    public void seed() {
        List<Share> shares = shareRepository.findAll();
        for (Share s : shares) {
            BigDecimal p = s.getPricePerShare();
            currentPrice.put(s.getId(), p);
            openPrice   .put(s.getId(), p);
            dayHigh     .put(s.getId(), p);
            dayLow      .put(s.getId(), p);
        }
        log.info("PriceSimulator seeded with {} shares", shares.size());
    }

    /**
     * Reload seed if new shares were added after startup.
     * Runs every 60 seconds to pick up any newly created shares.
     */
    @Scheduled(fixedDelay = 60_000)
    public void reseedNewShares() {
        List<Share> shares = shareRepository.findAll();
        for (Share s : shares) {
            currentPrice.computeIfAbsent(s.getId(), id -> {
                BigDecimal p = s.getPricePerShare();
                openPrice.put(id, p);
                dayHigh  .put(id, p);
                dayLow   .put(id, p);
                log.info("PriceSimulator: added new share id={} price={}", id, p);
                return p;
            });
        }
    }

    /**
     * Main tick — fires every 3 seconds.
     * Computes a new price for every share and broadcasts it.
     */
    @Scheduled(fixedDelay = 3_000)
    public void tick() {
        if (currentPrice.isEmpty()) return;

        currentPrice.forEach((shareId, prev) -> {
            BigDecimal open = openPrice.get(shareId);
            if (open == null) return;

            // ── Compute new price ────────────────────────────────────────────
            BigDecimal next = computeNext(prev, open);

            // ── Update day high / low ────────────────────────────────────────
            BigDecimal high = dayHigh.get(shareId);
            BigDecimal low  = dayLow .get(shareId);
            if (next.compareTo(high) > 0) dayHigh.put(shareId, next);
            if (next.compareTo(low)  < 0) dayLow .put(shareId, next);
            currentPrice.put(shareId, next);

            // ── Compute percentage changes ───────────────────────────────────
            double dayPct  = percentChange(open, next);
            double tickPct = percentChange(prev, next);

            // ── Broadcast ───────────────────────────────────────────────────
            PriceTick tick = new PriceTick(
                    shareId, next, open,
                    dayHigh.get(shareId), dayLow.get(shareId),
                    dayPct, tickPct
            );
            messagingTemplate.convertAndSend("/topic/prices", tick);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRICE ENGINE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns next price obeying both constraints:
     *   1. |next - prev| / prev  ≤  MAX_TICK_FRACTION  (±5%  per tick)
     *   2. |next - open| / open  ≤  MAX_DAY_FRACTION   (±20% per day)
     */
    private BigDecimal computeNext(BigDecimal prev, BigDecimal open) {
        // Random walk: uniform in [-MAX_TICK_FRACTION, +MAX_TICK_FRACTION]
        double tickFraction = (random.nextDouble() * 2 - 1) * MAX_TICK_FRACTION;

        // Proposed new price before day-cap
        double proposed = prev.doubleValue() * (1 + tickFraction);

        // Hard-clamp to ±20% of open
        double maxPrice = open.doubleValue() * (1 + MAX_DAY_FRACTION);
        double minPrice = open.doubleValue() * (1 - MAX_DAY_FRACTION);
        proposed = Math.min(Math.max(proposed, minPrice), maxPrice);

        return BigDecimal.valueOf(proposed).setScale(2, RoundingMode.HALF_UP);
    }

    private double percentChange(BigDecimal from, BigDecimal to) {
        if (from.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return (to.doubleValue() - from.doubleValue()) / from.doubleValue() * 100.0;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ METHODS (used by REST endpoint to give initial state to new clients)
    // ─────────────────────────────────────────────────────────────────────────

    public PriceTick getLatest(Long shareId) {
        BigDecimal price = currentPrice.get(shareId);
        BigDecimal open  = openPrice   .get(shareId);
        if (price == null || open == null) return null;
        double dayPct = percentChange(open, price);
        return new PriceTick(
                shareId, price, open,
                dayHigh.get(shareId), dayLow.get(shareId),
                dayPct, 0.0
        );
    }

    public Map<Long, BigDecimal> getAllCurrentPrices() {
        return Map.copyOf(currentPrice);
    }
}