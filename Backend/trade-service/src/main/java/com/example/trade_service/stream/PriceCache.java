package com.example.trade_service.stream;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PriceCache {

    private final Map<Long, Double> priceMap = new ConcurrentHashMap<>();

    public void updatePrice(Long companyId, double price) {
        priceMap.put(companyId, price);
    }

    public double getPrice(Long companyId) {
        return priceMap.getOrDefault(companyId, 0.0);
    }

    public Map<Long, Double> getAllPrices() {
        return priceMap;
    }
}