package com.sharebazaar.portfolio.sync;

import com.sharebazaar.portfolio.domain.Stock;
import com.sharebazaar.portfolio.repository.StockRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Syncs portfolio-service Stock table from stock-service (8082).
 *
 * Match priority:  companyId  →  symbol  →  create new
 * This prevents duplicate key errors when DataSeeder already inserted
 * rows with the same company_id but the symbol lookup misses them.
 *
 * application.properties:
 *   stock.service.url=http://localhost:8082
 */
@Service
public class StockSyncService {

    private static final Logger log = LoggerFactory.getLogger(StockSyncService.class);

    private final StockRepository stockRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${stock.service.url:http://localhost:8082}")
    private String stockServiceUrl;

    public StockSyncService(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void syncOnStartup() {
        log.info("[StockSync] Running initial sync from stock-service...");
        sync();
    }

    @Scheduled(fixedDelay = 60_000)
    public void syncScheduled() {
        sync();
    }

    public void sync() {
        try {
            // ── 1. Fetch companies from stock-service ─────────────────────────
            ResponseEntity<List<Map<String, Object>>> companyRes = restTemplate.exchange(
                    stockServiceUrl + "/api/companies",
                    HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            List<Map<String, Object>> companies = companyRes.getBody();
            if (companies == null || companies.isEmpty()) {
                log.warn("[StockSync] No companies returned from stock-service");
                return;
            }

            // ── 2. Fetch share data → map by companyId ────────────────────────
            Map<Long, Map<String, Object>> shareByCompanyId = new HashMap<>();
            try {
                ResponseEntity<List<Map<String, Object>>> shareRes = restTemplate.exchange(
                        stockServiceUrl + "/api/shares",
                        HttpMethod.GET, null,
                        new ParameterizedTypeReference<List<Map<String, Object>>>() {}
                );
                List<Map<String, Object>> shares = shareRes.getBody();
                if (shares != null) {
                    for (Map<String, Object> share : shares) {
                        Long cid = toLong(share.get("companyId"));
                        if (cid != null) shareByCompanyId.put(cid, share);
                    }
                }
            } catch (Exception e) {
                log.warn("[StockSync] Could not fetch shares endpoint (using defaults): {}", e.getMessage());
            }

            // ── 3. Upsert each company ────────────────────────────────────────
            int created = 0, updated = 0, skipped = 0;

            for (Map<String, Object> c : companies) {
                // Skip inactive companies
                Object activeObj = c.get("active");
                if (activeObj instanceof Boolean && !(Boolean) activeObj) continue;

                Long   companyId = toLong(c.get("id"));
                String symbol    = str(c.get("symbol"));
                String name      = str(c.get("name"));
                String sector    = str(c.get("sector"));

                if (symbol == null || symbol.isBlank()) continue;
                symbol = symbol.toUpperCase();

                // Share / price data
                Map<String, Object> share = companyId != null ? shareByCompanyId.get(companyId) : null;
                long totalShares          = share != null ? toLongVal(share.get("totalShares"),     10000L) : 10000L;
                long availableShares      = share != null ? toLongVal(share.get("availableShares"), 10000L) : 10000L;
                BigDecimal price          = share != null ? toBD(share.get("pricePerShare"), "100.00")     : new BigDecimal("100.00");

                // ── Look up existing row: try companyId first, then symbol ────
                //
                // Trying companyId FIRST is critical — the DataSeeder inserts rows
                // with companyId 1-15.  If the sync only looked up by symbol and the
                // symbol from 8082 differs even slightly (case, spacing), it would
                // try to INSERT a new row and hit the unique constraint on company_id.
                Stock existing = null;

                if (companyId != null) {
                    existing = stockRepository.findByCompanyId(companyId).orElse(null);
                }
                if (existing == null) {
                    // Fallback: match by symbol (handles rows seeded without a companyId)
                    existing = stockRepository.findByCompanySymbol(symbol).orElse(null);
                }

                if (existing != null) {
                    // ── UPDATE existing row ───────────────────────────────────
                    boolean dirty = false;

                    if (!symbol.equals(existing.getCompanySymbol())) {
                        existing.setCompanySymbol(symbol);
                        dirty = true;
                    }
                    if (name != null && !name.equals(existing.getCompanyName())) {
                        existing.setCompanyName(name);
                        dirty = true;
                    }
                    if (sector != null && !sector.equals(existing.getSector())) {
                        existing.setSector(sector);
                        dirty = true;
                    }
                    // Fix companyId if the seeder stored 0 or a different value
                    if (companyId != null && !companyId.equals(existing.getCompanyId())) {
                        existing.setCompanyId(companyId);
                        dirty = true;
                    }

                    if (dirty) {
                        stockRepository.save(existing);
                        updated++;
                    } else {
                        skipped++;
                    }

                } else {
                    // ── CREATE new row ────────────────────────────────────────
                    Stock s = new Stock(
                            companyId != null ? companyId : 0L,
                            symbol,
                            name != null ? name : symbol,
                            sector != null ? sector : "Other",
                            totalShares,
                            price
                    );
                    s.setAvailableShares(availableShares);
                    stockRepository.save(s);
                    created++;
                    log.info("[StockSync] Created stock: {} — {}", symbol, name);
                }
            }

            log.info("[StockSync] Sync complete — {} created, {} updated, {} skipped", created, updated, skipped);

        } catch (Exception e) {
            log.error("[StockSync] Sync failed: {}", e.getMessage(), e);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Long toLong(Object val) {
        if (val == null) return null;
        try { return Long.valueOf(val.toString()); } catch (Exception e) { return null; }
    }

    private long toLongVal(Object val, long fallback) {
        Long v = toLong(val);
        return v != null ? v : fallback;
    }

    private String str(Object val) {
        return val != null ? val.toString().trim() : null;
    }

    private BigDecimal toBD(Object val, String fallback) {
        if (val == null) return new BigDecimal(fallback);
        try { return new BigDecimal(val.toString()); } catch (Exception e) { return new BigDecimal(fallback); }
    }
}