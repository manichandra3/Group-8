package com.example.trade_service.dto;

/**
 * Broadcast to /topic/prices every second per company.
 *
 * Fields match exactly what your MarketEngine already computes:
 *   - companyId   → from Company.id
 *   - price       → new price after tick (from PriceCache)
 *   - open        → Company.openingPrice  (day open, fixed)
 *   - high        → Company.dayHigh       (tracked in MarketEngine)
 *   - low         → Company.dayLow        (tracked in MarketEngine)
 *   - dayChangePct → % change from open, already capped ±20% by MarketEngine
 *   - tickChangePct→ % change from previous tick price
 */
public class PriceTick {

    private Long   companyId;
    private String companyName;    // handy for the frontend ticker tape
    private double price;
    private double open;
    private double high;
    private double low;
    private double dayChangePct;
    private double tickChangePct;

    public PriceTick() {}

    public PriceTick(Long companyId, String companyName,
                     double price, double open, double high, double low,
                     double dayChangePct, double tickChangePct) {
        this.companyId      = companyId;
        this.companyName    = companyName;
        this.price          = price;
        this.open           = open;
        this.high           = high;
        this.low            = low;
        this.dayChangePct   = dayChangePct;
        this.tickChangePct  = tickChangePct;
    }

    // ── Getters (Jackson needs these for JSON serialisation) ─────────────────

    public Long   getCompanyId()      { return companyId; }
    public String getCompanyName()    { return companyName; }
    public double getPrice()          { return price; }
    public double getOpen()           { return open; }
    public double getHigh()           { return high; }
    public double getLow()            { return low; }
    public double getDayChangePct()   { return dayChangePct; }
    public double getTickChangePct()  { return tickChangePct; }
}