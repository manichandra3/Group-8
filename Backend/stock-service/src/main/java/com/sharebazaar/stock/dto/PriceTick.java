package com.sharebazaar.stock.dto;

import java.math.BigDecimal;

/**
 * Sent to /topic/prices every 3 seconds per share.
 * Frontend uses shareId to update its local state.
 */
public class PriceTick {

    private Long      shareId;
    private BigDecimal price;       // current live price
    private BigDecimal open;        // day open price (fixed at session start)
    private BigDecimal high;        // day high so far
    private BigDecimal low;         // day low so far
    private double    dayChangePct; // % change from open, capped at ±20%
    private double    tickChangePct;// % change from previous tick, capped at ±5%

    public PriceTick() {}

    public PriceTick(Long shareId, BigDecimal price, BigDecimal open,
                     BigDecimal high, BigDecimal low,
                     double dayChangePct, double tickChangePct) {
        this.shareId       = shareId;
        this.price         = price;
        this.open          = open;
        this.high          = high;
        this.low           = low;
        this.dayChangePct  = dayChangePct;
        this.tickChangePct = tickChangePct;
    }

    // ── Getters ────────────────────────────────────────────────────────────────
    public Long      getShareId()        { return shareId; }
    public BigDecimal getPrice()         { return price; }
    public BigDecimal getOpen()          { return open; }
    public BigDecimal getHigh()          { return high; }
    public BigDecimal getLow()           { return low; }
    public double    getDayChangePct()   { return dayChangePct; }
    public double    getTickChangePct()  { return tickChangePct; }
}