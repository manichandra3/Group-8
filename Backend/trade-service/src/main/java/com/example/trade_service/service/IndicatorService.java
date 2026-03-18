package com.example.trade_service.service;

import com.example.trade_service.domain.Candle;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class IndicatorService {

    public double movingAverage(List<Candle> candles, int period) {

        if (candles.size() < period) return 0;

        return candles.stream()
                .skip(candles.size() - period)
                .mapToDouble(Candle::getClose)
                .average()
                .orElse(0);
    }

    public double rsi(List<Candle> candles, int period) {

        if (candles.size() < period + 1) return 0;

        double gain = 0, loss = 0;

        for (int i = candles.size() - period; i < candles.size(); i++) {

            double diff = candles.get(i).getClose() - candles.get(i - 1).getClose();

            if (diff > 0) gain += diff;
            else loss -= diff;
        }

        double avgGain = gain / period;
        double avgLoss = loss / period;

        if (avgLoss == 0) return 100;

        double rs = avgGain / avgLoss;

        return 100 - (100 / (1 + rs));
    }
}