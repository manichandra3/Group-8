package com.example.trade_service.sync;

import com.example.trade_service.domain.Company;
import com.example.trade_service.repository.CompanyRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Syncs trade-service `company` table from stock-service on startup
 * and every 60 seconds.
 *
 * Matching strategy: by NAME (case-insensitive trim), NOT by ID —
 * because the two services have independent auto-increment sequences.
 *
 * application.properties:
 *   stock.service.url=http://localhost:8082
 */
@Service
public class CompanySyncService {

    @Autowired
    private CompanyRepository companyRepository;

    @Value("${stock.service.url:http://localhost:8082}")
    private String stockServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @EventListener(ApplicationReadyEvent.class)
    public void syncOnStartup() {
        sync();
    }

    @Scheduled(fixedRate = 60_000)
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
            List<Map<String, Object>> stockCompanies = companyRes.getBody();
            if (stockCompanies == null || stockCompanies.isEmpty()) {
                System.out.println("[CompanySync] No companies from stock-service.");
                return;
            }

            // ── 2. Fetch share prices from stock-service ──────────────────────
            // Map: stock-service companyId → pricePerShare
            Map<Long, Double> sharePriceByStockId = new HashMap<>();
            try {
                ResponseEntity<List<Map<String, Object>>> shareRes = restTemplate.exchange(
                        stockServiceUrl + "/api/shares",
                        HttpMethod.GET, null,
                        new ParameterizedTypeReference<List<Map<String, Object>>>() {}
                );
                List<Map<String, Object>> shares = shareRes.getBody();
                if (shares != null) {
                    for (Map<String, Object> share : shares) {
                        Long   stockCompanyId = Long.valueOf(share.get("companyId").toString());
                        Double price          = Double.valueOf(share.get("pricePerShare").toString());
                        sharePriceByStockId.put(stockCompanyId, price);
                    }
                }
            } catch (Exception e) {
                System.err.println("[CompanySync] Could not fetch shares (fallback ₹100): " + e.getMessage());
            }

            // ── 3. Upsert by NAME — safe regardless of ID sequences ───────────
            int created = 0, updated = 0, skipped = 0;

            for (Map<String, Object> sc : stockCompanies) {
                // Skip inactive companies
                Object activeObj = sc.get("active");
                if (activeObj instanceof Boolean && !(Boolean) activeObj) continue;

                Long   stockId   = Long.valueOf(sc.get("id").toString());
                String name      = sc.get("name").toString().trim();
                double seedPrice = sharePriceByStockId.getOrDefault(stockId, 100.00);

                // Find existing trade-service company by name (case-insensitive)
                Optional<Company> existing = companyRepository
                        .findByNameIgnoreCase(name);

                if (existing.isPresent()) {
                    Company c     = existing.get();
                    boolean dirty = false;

                    // Seed openingPrice only if never set
                    if (c.getOpeningPrice() == 0 && seedPrice > 0) {
                        c.setOpeningPrice(seedPrice);
                        c.setLastPrice(seedPrice);
                        dirty = true;
                        updated++;
                    }

                    if (dirty) {
                        companyRepository.save(c);
                    } else {
                        skipped++;
                    }

                } else {
                    // Create new — let the DB assign its own auto-increment ID
                    Company c = new Company();
                    c.setName(name);
                    c.setLastPrice(seedPrice);
                    c.setOpeningPrice(seedPrice);
                    c.setDayHigh(0);   // MarketEngine sets these on first tick
                    c.setDayLow(0);
                    companyRepository.save(c);
                    created++;
                }
            }

            System.out.printf("[CompanySync] Done — %d created, %d updated, %d skipped.%n",
                    created, updated, skipped);

        } catch (Exception e) {
            System.err.println("[CompanySync] Sync failed: " + e.getMessage());
        }
    }
}