package com.example.trade_service.engine;

import com.example.trade_service.domain.Candle;
import com.example.trade_service.repository.CandleRepository;
import com.example.trade_service.stream.PriceBuffer;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
public class CandleEngine {

    @Autowired
    private PriceBuffer priceBuffer;

    @Autowired
    private CandleRepository candleRepo;

    // ⏱ runs every 1 minute
    @Scheduled(fixedRate = 60000)
    public void generateCandles() {

        Map<Long, List<Double>> allPrices = priceBuffer.drainAll();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.minusMinutes(1);

        for (Map.Entry<Long, List<Double>> entry : allPrices.entrySet()) {

            Long companyId = entry.getKey();
            List<Double> prices = entry.getValue();

            if (prices == null || prices.isEmpty()) continue;

            double open = prices.get(0);
            double close = prices.get(prices.size() - 1);
            double high = prices.stream().max(Double::compare).orElse(open);
            double low = prices.stream().min(Double::compare).orElse(open);

            Candle candle = new Candle();
            candle.setCompanyId(companyId);
            candle.setOpen(open);
            candle.setClose(close);
            candle.setHigh(high);
            candle.setLow(low);
            candle.setStartTime(start);
            candle.setEndTime(now);
            candle.setInterval("5m");

            candleRepo.save(candle);
        }
    }
}