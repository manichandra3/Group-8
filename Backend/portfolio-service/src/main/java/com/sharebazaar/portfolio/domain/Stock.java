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

    public Stock() {
    }

    public Stock(Long companyId, String companySymbol, String companyName, Long totalShares, BigDecimal currentPrice) {
        this.companyId = companyId;
        this.companySymbol = companySymbol;
        this.companyName = companyName;
        this.totalShares = totalShares;
        this.availableShares = totalShares;
        this.currentPrice = currentPrice;
    }

    /**
     * Records a buy transaction - decreases available shares and increases total bought
     */
    public void recordBuy(Long quantity) {
        if (quantity > this.availableShares) {
            throw new IllegalStateException("Insufficient shares available for purchase");
        }
        this.availableShares -= quantity;
        this.totalSharesBought += quantity;
    }

    /**
     * Records a sell transaction - increases available shares and decreases total bought
     */
    public void recordSell(Long quantity) {
        if (quantity > this.totalSharesBought) {
            throw new IllegalStateException("Cannot sell more shares than have been bought");
        }
        this.availableShares += quantity;
        this.totalSharesBought -= quantity;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public String getCompanySymbol() {
        return companySymbol;
    }

    public void setCompanySymbol(String companySymbol) {
        this.companySymbol = companySymbol;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public Long getTotalShares() {
        return totalShares;
    }

    public void setTotalShares(Long totalShares) {
        this.totalShares = totalShares;
    }

    public Long getAvailableShares() {
        return availableShares;
    }

    public void setAvailableShares(Long availableShares) {
        this.availableShares = availableShares;
    }

    public Long getTotalSharesBought() {
        return totalSharesBought;
    }

    public void setTotalSharesBought(Long totalSharesBought) {
        this.totalSharesBought = totalSharesBought;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(BigDecimal currentPrice) {
        this.currentPrice = currentPrice;
    }

    public Long getVersion() {
        return version;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
