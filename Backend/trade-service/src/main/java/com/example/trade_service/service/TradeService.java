package com.example.trade_service.service;

import com.example.trade_service.domain.Company;
import com.example.trade_service.domain.Trade;
import com.example.trade_service.dto.TradeRequest;
import com.example.trade_service.enums.OrderStatus;
import com.example.trade_service.enums.OrderType;
import com.example.trade_service.repository.CompanyRepository;
import com.example.trade_service.repository.TradeRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class TradeService {

    @Autowired
    private CompanyRepository companyRepo;

    @Autowired
    private TradeRepository tradeRepo;

    public Trade placeOrder(TradeRequest req, String side) {

        if (req.getQuantity() <= 0) {
            throw new RuntimeException("Quantity must be > 0");
        }

        Company company = companyRepo.findById(req.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Company not found"));

        double marketPrice = company.getLastPrice();

        Trade trade = new Trade();
        trade.setUserId(req.getUserId());
        trade.setCompanyId(req.getCompanyId());
        trade.setQuantity(req.getQuantity());
        trade.setSide(side);
        trade.setCreatedAt(LocalDateTime.now());

        OrderType type = req.getOrderType() == null ? OrderType.MARKET : req.getOrderType();
        trade.setOrderType(type);

        switch (type) {

            case MARKET:
                trade.setPrice(marketPrice);
                trade.setStatus(OrderStatus.EXECUTED);
                break;

            case LIMIT:

                if (req.getPrice() == null) {
                    throw new RuntimeException("LIMIT order requires price");
                }

                trade.setPrice(req.getPrice());

                // 🔥 instant execution logic
                if (side.equals("BUY") && req.getPrice() >= marketPrice) {
                    trade.setStatus(OrderStatus.EXECUTED);
                } else if (side.equals("SELL") && req.getPrice() <= marketPrice) {
                    trade.setStatus(OrderStatus.EXECUTED);
                } else {
                    trade.setStatus(OrderStatus.PENDING);
                }

                break;

            case GTT:

                if (req.getTriggerPrice() == null) {
                    throw new RuntimeException("GTT requires triggerPrice");
                }

                trade.setPrice(req.getPrice() != null ? req.getPrice() : marketPrice);
                trade.setTriggerPrice(req.getTriggerPrice());
                trade.setStatus(OrderStatus.PENDING);

                break;
        }

        return tradeRepo.save(trade);
    }
}