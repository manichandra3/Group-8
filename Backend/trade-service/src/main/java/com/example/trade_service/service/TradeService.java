package com.example.trade_service.service;

import com.example.trade_service.client.WalletClient;
import com.example.trade_service.domain.Company;
import com.example.trade_service.domain.Trade;
import com.example.trade_service.dto.TradeRequest;
import com.example.trade_service.enums.OrderStatus;
import com.example.trade_service.enums.OrderType;
import com.example.trade_service.repository.CompanyRepository;
import com.example.trade_service.repository.TradeRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class TradeService {

    @Autowired
    private CompanyRepository companyRepo;

    @Autowired
    private TradeRepository tradeRepo;

    @Autowired
    private WalletClient walletClient;

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

            case MARKET -> {
                trade.setPrice(marketPrice);

                // ── Wallet check for BUY orders ───────────────────────────────
                if (side.equals("BUY")) {
                    BigDecimal totalCost = BigDecimal.valueOf(marketPrice)
                            .multiply(BigDecimal.valueOf(req.getQuantity()));
                    // throws RuntimeException if insufficient — blocks the order
                    walletClient.withdraw(req.getUserId(), totalCost);
                }

                trade.setStatus(OrderStatus.EXECUTED);

                // ── Wallet credit for SELL orders ─────────────────────────────
                if (side.equals("SELL")) {
                    BigDecimal proceeds = BigDecimal.valueOf(marketPrice)
                            .multiply(BigDecimal.valueOf(req.getQuantity()));
                    walletClient.deposit(req.getUserId(), proceeds);   // non-blocking
                }
            }

            case LIMIT -> {
                if (req.getPrice() == null) {
                    throw new RuntimeException("LIMIT order requires price");
                }

                trade.setPrice(req.getPrice());

                boolean executedNow =
                        (side.equals("BUY")  && req.getPrice() >= marketPrice) ||
                                (side.equals("SELL") && req.getPrice() <= marketPrice);

                if (executedNow) {
                    // ── Wallet check / credit only when order executes immediately
                    if (side.equals("BUY")) {
                        BigDecimal totalCost = BigDecimal.valueOf(req.getPrice())
                                .multiply(BigDecimal.valueOf(req.getQuantity()));
                        walletClient.withdraw(req.getUserId(), totalCost);
                    }
                    trade.setStatus(OrderStatus.EXECUTED);
                    if (side.equals("SELL")) {
                        BigDecimal proceeds = BigDecimal.valueOf(req.getPrice())
                                .multiply(BigDecimal.valueOf(req.getQuantity()));
                        walletClient.deposit(req.getUserId(), proceeds);
                    }
                } else {
                    // PENDING — wallet is not touched yet.
                    // Deduct when the order gets picked up and executed later.
                    trade.setStatus(OrderStatus.PENDING);
                }
            }

            case GTT -> {
                if (req.getTriggerPrice() == null) {
                    throw new RuntimeException("GTT requires triggerPrice");
                }

                trade.setPrice(req.getPrice() != null ? req.getPrice() : marketPrice);
                trade.setTriggerPrice(req.getTriggerPrice());
                // GTT stays PENDING — wallet touched only when trigger fires
                trade.setStatus(OrderStatus.PENDING);
            }
        }

        return tradeRepo.save(trade);
    }
}