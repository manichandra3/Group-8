package com.sharebazaar.portfolio.config;

import com.sharebazaar.portfolio.domain.Stock;
import com.sharebazaar.portfolio.repository.StockRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Fallback seeder — only runs if the stock table is completely empty
 * AND StockSyncService failed to populate it from stock-service.
 *
 * Order(2) ensures StockSyncService (via ApplicationReadyEvent) runs first.
 * In practice, StockSyncService will populate the table before this runs
 * because ApplicationReadyEvent fires before CommandLineRunner completes startup.
 *
 * This is kept as a safety net for when stock-service is offline.
 */
@Component
@Order(2)
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final StockRepository stockRepository;

    public DataSeeder(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // Give StockSyncService a moment to populate from stock-service
        Thread.sleep(3000);

        if (stockRepository.count() == 0) {
            log.warn("[DataSeeder] Stock table still empty after sync — seeding fallback data");
            log.warn("[DataSeeder] These are hardcoded symbols. Start stock-service for live sync.");
            seedStockData();
            log.info("[DataSeeder] Fallback seed complete");
        } else {
            log.info("[DataSeeder] Stock table already populated ({} entries) — skipping fallback seed",
                    stockRepository.count());
        }
    }

    private void seedStockData() {
        List<Stock> stocks = List.of(
                new Stock(1L,  "TCS",         "Tata Consultancy Services",    "IT",              10000L, new BigDecimal("3500.00")),
                new Stock(2L,  "INFY",        "Infosys Limited",              "IT",              15000L, new BigDecimal("1450.00")),
                new Stock(3L,  "RELIANCE",    "Reliance Industries Limited",  "Energy",          20000L, new BigDecimal("2450.00")),
                new Stock(4L,  "HDFCBANK",    "HDFC Bank Limited",            "Banking",         12000L, new BigDecimal("1650.00")),
                new Stock(5L,  "ICICIBANK",   "ICICI Bank Limited",           "Banking",         11000L, new BigDecimal("1100.00")),
                new Stock(6L,  "WIPRO",       "Wipro Limited",                "IT",              14000L, new BigDecimal("420.00")),
                new Stock(7L,  "BHARTIARTL",  "Bharti Airtel Limited",        "Telecom",         16000L, new BigDecimal("1550.00")),
                new Stock(8L,  "ITC",         "ITC Limited",                  "FMCG",            18000L, new BigDecimal("450.00")),
                new Stock(9L,  "SBIN",        "State Bank of India",          "Banking",         13000L, new BigDecimal("780.00")),
                new Stock(10L, "HINDUNILVR",  "Hindustan Unilever Limited",   "FMCG",             9000L, new BigDecimal("2350.00")),
                new Stock(11L, "LT",          "Larsen & Toubro Limited",      "Infrastructure",   8000L, new BigDecimal("3450.00")),
                new Stock(12L, "AXISBANK",    "Axis Bank Limited",            "Banking",         10500L, new BigDecimal("1150.00")),
                new Stock(13L, "MARUTI",      "Maruti Suzuki India Limited",  "Auto",             7000L, new BigDecimal("12500.00")),
                new Stock(14L, "ASIANPAINT",  "Asian Paints Limited",         "Chemicals",        6500L, new BigDecimal("2850.00")),
                new Stock(15L, "TITAN",       "Titan Company Limited",        "Consumer Goods",  11500L, new BigDecimal("3150.00"))
        );
        stockRepository.saveAll(stocks);
    }
}