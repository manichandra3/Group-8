package com.sharebazaar.portfolio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stocks")
public class Stock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, unique = true)
    private Long companyId;

    @Column(name = "company_symbol", nullable = false, unique = true, length = 20)
    private String companySymbol;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(name = "sector", length = 60)
    private String sector;

    @Column(name = "total_shares", nullable = false)
    private Long totalShares;

    @Column(name = "available_shares", nullable = false)
    private Long availableShares;

    @Column(name = "total_shares_bought", nullable = false)
    private Long totalSharesBought = 0L;

    @Column(name = "current_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentPrice;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Stock() {}

    // Original constructor — sector defaults to null (backward compatible)
    public Stock(Long companyId, String companySymbol, String companyName,
                 Long totalShares, BigDecimal currentPrice) {
        this.companyId       = companyId;
        this.companySymbol   = companySymbol;
        this.companyName     = companyName;
        this.totalShares     = totalShares;
        this.availableShares = totalShares;
        this.currentPrice    = currentPrice;
    }

    // New constructor with sector
    public Stock(Long companyId, String companySymbol, String companyName,
                 String sector, Long totalShares, BigDecimal currentPrice) {
        this.companyId       = companyId;
        this.companySymbol   = companySymbol;
        this.companyName     = companyName;
        this.sector          = sector;
        this.totalShares     = totalShares;
        this.availableShares = totalShares;
        this.currentPrice    = currentPrice;
    }

    public void recordBuy(Long quantity) {
        if (quantity > this.availableShares) {
            throw new IllegalStateException("Insufficient shares available for purchase");
        }
        this.availableShares   -= quantity;
        this.totalSharesBought += quantity;
    }

    public void recordSell(Long quantity) {
        if (quantity > this.totalSharesBought) {
            throw new IllegalStateException("Cannot sell more shares than have been bought");
        }
        this.availableShares   += quantity;
        this.totalSharesBought -= quantity;
    }

    // Getters & setters
    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public Long getCompanyId()                   { return companyId; }
    public void setCompanyId(Long companyId)     { this.companyId = companyId; }

    public String getCompanySymbol()             { return companySymbol; }
    public void setCompanySymbol(String s)       { this.companySymbol = s; }

    public String getCompanyName()               { return companyName; }
    public void setCompanyName(String s)         { this.companyName = s; }

    public String getSector()                    { return sector; }
    public void setSector(String sector)         { this.sector = sector; }

    public Long getTotalShares()                 { return totalShares; }
    public void setTotalShares(Long n)           { this.totalShares = n; }

    public Long getAvailableShares()             { return availableShares; }
    public void setAvailableShares(Long n)       { this.availableShares = n; }

    public Long getTotalSharesBought()           { return totalSharesBought; }
    public void setTotalSharesBought(Long n)     { this.totalSharesBought = n; }

    public BigDecimal getCurrentPrice()          { return currentPrice; }
    public void setCurrentPrice(BigDecimal p)    { this.currentPrice = p; }

    public Long getVersion()                     { return version; }

    public LocalDateTime getCreatedAt()          { return createdAt; }
    public LocalDateTime getUpdatedAt()          { return updatedAt; }
}