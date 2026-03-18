package com.example.trade_service.enums;

public enum OrderType {
    MARKET,
    LIMIT,
    GTT;

    public boolean requiresPrice() {
        return this == LIMIT;
    }

    public boolean requiresTrigger() {
        return this == GTT;
    }
}