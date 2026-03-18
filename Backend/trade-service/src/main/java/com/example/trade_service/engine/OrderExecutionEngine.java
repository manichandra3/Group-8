package com.example.trade_service.engine;

import com.example.trade_service.domain.Trade;
import com.example.trade_service.enums.OrderStatus;
import com.example.trade_service.enums.OrderType;
import com.example.trade_service.repository.TradeRepository;
import com.example.trade_service.stream.PriceCache;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class OrderExecutionEngine {

    @Autowired
    private TradeRepository tradeRepo;

    @Autowired
    private PriceCache priceCache;

    @Scheduled(fixedRate = 1000)
    public void processOrders() {

        List<Trade> pendingOrders = tradeRepo.findByStatus(OrderStatus.PENDING);

        for (Trade trade : pendingOrders) {

            double marketPrice = priceCache.getPrice(trade.getCompanyId());
            if (marketPrice == 0) continue;

            switch (trade.getOrderType()) {

                case LIMIT:
                    processLimit(trade, marketPrice);
                    break;

                case GTT:
                    processGTT(trade, marketPrice);
                    break;

                default:
                    break;
            }
        }
    }

    private void processLimit(Trade trade, double marketPrice) {

        if ("BUY".equals(trade.getSide()) && marketPrice <= trade.getPrice()) {
            execute(trade, marketPrice);
        }

        if ("SELL".equals(trade.getSide()) && marketPrice >= trade.getPrice()) {
            execute(trade, marketPrice);
        }
    }

    private void processGTT(Trade trade, double marketPrice) {

        Double trigger = trade.getTriggerPrice();
        if (trigger == null) return;

        if ("BUY".equals(trade.getSide()) && marketPrice >= trigger) {
            execute(trade, marketPrice);
        }

        if ("SELL".equals(trade.getSide()) && marketPrice <= trigger) {
            execute(trade, marketPrice);
        }
    }

    private void execute(Trade trade, double marketPrice) {

        trade.setPrice(marketPrice);
        trade.setStatus(OrderStatus.EXECUTED);

        tradeRepo.save(trade);

        System.out.println("EXECUTED: " + trade.getId() + " at " + marketPrice);
    }
}