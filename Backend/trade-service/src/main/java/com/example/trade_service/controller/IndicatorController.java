package com.example.trade_service.controller;

import com.example.trade_service.service.IndicatorService;
import com.example.trade_service.domain.Candle;
import com.example.trade_service.repository.CandleRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/indicators")
public class IndicatorController {

    @Autowired
    private CandleRepository candleRepo;

    @Autowired
    private IndicatorService indicatorService;

    // 📊 Get Moving Average + RSI
    @GetMapping("/{companyId}")
    public Map<String, Double> getIndicators(@PathVariable Long companyId) {

        List<Candle> candles = candleRepo.findByCompanyIdOrderByStartTimeAsc(companyId);

        if (candles.isEmpty()) {
            throw new RuntimeException("No candle data available");
        }

        double ma = indicatorService.movingAverage(candles, 5); // 5-period MA
        double rsi = indicatorService.rsi(candles, 14);

        Map<String, Double> response = new HashMap<>();
        response.put("MovingAverage", ma);
        response.put("RSI", rsi);

        return response;
    }
}