package com.example.trade_service.dto;

import com.example.trade_service.enums.OrderType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class TradeRequest {

    @NotNull
    private Long userId;

    @NotNull
    private Long companyId;

    @Min(1)
    private int quantity;

    private OrderType orderType = OrderType.MARKET; // default

    private Double price;         // LIMIT
    private Double triggerPrice;  // GTT

    // getters + setters

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public OrderType getOrderType() {
        return orderType;
    }

    public void setOrderType(OrderType orderType) {
        this.orderType = orderType;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Double getTriggerPrice() {
        return triggerPrice;
    }

    public void setTriggerPrice(Double triggerPrice) {
        this.triggerPrice = triggerPrice;
    }
}