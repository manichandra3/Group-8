package com.example.trade_service.domain;

import com.example.trade_service.enums.OrderStatus;
import com.example.trade_service.enums.OrderType;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(indexes = {
    @Index(name = "idx_trade_status", columnList = "status"),
    @Index(name = "idx_trade_company", columnList = "companyId")
})
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Long companyId;

    private double price;
    private int quantity;

    private String side; // BUY / SELL

    @Enumerated(EnumType.STRING)
    private OrderType orderType;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    private Double triggerPrice;

    private LocalDateTime createdAt;

    private boolean isIntraday = false; // 🔥 future

    // getters & setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getSide() {
        return side;
    }

    public void setSide(String side) {
        this.side = side;
    }

    public OrderType getOrderType() {
        return orderType;
    }

    public void setOrderType(OrderType orderType) {
        this.orderType = orderType;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public Double getTriggerPrice() {
        return triggerPrice;
    }

    public void setTriggerPrice(Double triggerPrice) {
        this.triggerPrice = triggerPrice;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isIntraday() {
        return isIntraday;
    }

    public void setIntraday(boolean intraday) {
        isIntraday = intraday;
    }
}