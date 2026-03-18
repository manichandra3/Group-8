package com.example.trade_service.stream;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PriceBuffer {
    public Map<Long, List<Double>> getAllPrices() {
        return priceMap;
    }
    
    private final Map<Long, List<Double>> priceMap = new ConcurrentHashMap<>();

    // called every second from MarketEngine
    public void addPrice(Long companyId, double price) {
        priceMap.computeIfAbsent(companyId, k -> new ArrayList<>()).add(price);
    }

    // called by CandleEngine
    public Map<Long, List<Double>> drainAll() {

        Map<Long, List<Double>> copy = new HashMap<>(priceMap);
        priceMap.clear();

        return copy;
    }
}