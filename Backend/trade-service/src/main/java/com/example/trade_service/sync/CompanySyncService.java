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

/**
 * Syncs trade-service `company` table from stock-service on startup
 * and every 60 seconds.
 *
 * Uses pricePerShare from the stock-service `shares` table as the
 * seed price so MarketEngine starts from the real IPO/listing price.
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
            // ── 1. Fetch all active companies from stock-service ──────────────
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

            // ── 2. Fetch all share listings from stock-service ────────────────
            //    Build a map of companyId -> pricePerShare
            Map<Long, Double> sharePriceByCompanyId = new HashMap<>();
            try {
                ResponseEntity<List<Map<String, Object>>> shareRes = restTemplate.exchange(
                        stockServiceUrl + "/api/shares",
                        HttpMethod.GET, null,
                        new ParameterizedTypeReference<List<Map<String, Object>>>() {}
                );
                List<Map<String, Object>> shares = shareRes.getBody();
                if (shares != null) {
                    for (Map<String, Object> share : shares) {
                        Long companyId   = Long.valueOf(share.get("companyId").toString());
                        Double seedPrice = Double.valueOf(share.get("pricePerShare").toString());
                        // If a company has multiple share listings, take the latest (last wins)
                        sharePriceByCompanyId.put(companyId, seedPrice);
                    }
                }
            } catch (Exception e) {
                System.err.println("[CompanySync] Could not fetch shares (will use 100 as fallback): " + e.getMessage());
            }

            // ── 3. Upsert into trade-service company table ────────────────────
            int created = 0, updated = 0, skipped = 0;

            for (Map<String, Object> sc : stockCompanies) {
                Object activeObj = sc.get("active");
                if (activeObj instanceof Boolean && !(Boolean) activeObj) continue;

                Long   id   = Long.valueOf(sc.get("id").toString());
                String name = sc.get("name").toString();

                // Use the share listing price; fall back to 100 if no share listed yet
                double seedPrice = sharePriceByCompanyId.getOrDefault(id, 100.00);

                if (companyRepository.existsById(id)) {
                    companyRepository.findById(id).ifPresent(existing -> {
                        boolean dirty = false;

                        // Keep name in sync with stock-service
                        if (!existing.getName().equals(name)) {
                            existing.setName(name);
                            dirty = true;
                        }

                        // Only update openingPrice if it was never set (0),
                        // so we don't overwrite today's real open mid-session
                        if (existing.getOpeningPrice() == 0 && seedPrice > 0) {
                            existing.setOpeningPrice(seedPrice);
                            existing.setLastPrice(seedPrice);
                            dirty = true;
                        }

                        if (dirty) companyRepository.save(existing);
                    });
                    skipped++;
                } else {
                    Company company = new Company();
                    company.setId(id);
                    company.setName(name);
                    company.setLastPrice(seedPrice);
                    company.setOpeningPrice(seedPrice);
                    company.setDayHigh(0);   // MarketEngine seeds on first tick
                    company.setDayLow(0);
                    companyRepository.save(company);
                    created++;
                }
            }

            System.out.printf("[CompanySync] Done — %d created, %d already existed (%d updated).%n",
                    created, skipped, updated);

        } catch (Exception e) {
            System.err.println("[CompanySync] Sync failed: " + e.getMessage());
        }
    }
}