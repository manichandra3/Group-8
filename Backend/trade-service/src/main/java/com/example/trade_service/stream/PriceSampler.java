package com.example.trade_service.stream;

import com.example.trade_service.domain.PriceHistory;
import com.example.trade_service.repository.PriceHistoryRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component
public class PriceSampler {

    @Autowired
    private PriceBuffer buffer;

    @Autowired
    private PriceHistoryRepository repo;

    @Scheduled(fixedRate = 1000)
    public void sample() {

        // Take a snapshot of current prices without draining (CandleEngine drains separately)
        Map<Long, java.util.List<Double>> data = new java.util.HashMap<>(buffer.getAllPrices());

        data.forEach((companyId, prices) -> {
            if (prices.isEmpty()) return;
            double last = prices.get(prices.size() - 1);

            PriceHistory ph = new PriceHistory();
            ph.setCompanyId(companyId);
            ph.setPrice(last);
            ph.setTimestamp(LocalDateTime.now());

            repo.save(ph);
        });
    }
}