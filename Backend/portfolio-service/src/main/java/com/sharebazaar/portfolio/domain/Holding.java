package com.sharebazaar.portfolio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "holdings")
public class Holding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "company_symbol", nullable = false, length = 20)
    private String companySymbol;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(name = "quantity", nullable = false)
    private Long quantity = 0L;

    @Column(name = "average_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal averagePrice = BigDecimal.ZERO;

    @Column(name = "total_investment", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalInvestment = BigDecimal.ZERO;

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

    public Holding() {
    }

    public Holding(Portfolio portfolio, Long companyId, String companySymbol, String companyName) {
        this.portfolio = portfolio;
        this.companyId = companyId;
        this.companySymbol = companySymbol;
        this.companyName = companyName;
    }

    /**
     * Calculates and updates the weighted average price when buying shares
     * Formula: Average Price = (Q1 × P1 + Q2 × P2) / (Q1 + Q2)
     */
    public void addShares(Long quantityToBuy, BigDecimal purchasePrice) {
        BigDecimal currentTotalInvestment = this.totalInvestment;
        BigDecimal newInvestment = purchasePrice.multiply(new BigDecimal(quantityToBuy));
        
        this.totalInvestment = currentTotalInvestment.add(newInvestment);
        this.quantity = this.quantity + quantityToBuy;
        
        if (this.quantity > 0) {
            this.averagePrice = this.totalInvestment.divide(
                new BigDecimal(this.quantity), 
                2, 
                RoundingMode.HALF_UP
            );
        }
    }

    /**
     * Removes shares when selling (maintains the same average price)
     */
    public void removeShares(Long quantityToSell) {
        if (quantityToSell > this.quantity) {
            throw new IllegalArgumentException("Cannot sell more shares than held");
        }
        
        BigDecimal soldInvestment = this.averagePrice.multiply(new BigDecimal(quantityToSell));
        this.totalInvestment = this.totalInvestment.subtract(soldInvestment);
        this.quantity = this.quantity - quantityToSell;
        
        // If all shares are sold, reset average price and total investment
        if (this.quantity == 0) {
            this.averagePrice = BigDecimal.ZERO;
            this.totalInvestment = BigDecimal.ZERO;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Portfolio getPortfolio() {
        return portfolio;
    }

    public void setPortfolio(Portfolio portfolio) {
        this.portfolio = portfolio;
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

    public Long getQuantity() {
        return quantity;
    }

    public void setQuantity(Long quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getAveragePrice() {
        return averagePrice;
    }

    public void setAveragePrice(BigDecimal averagePrice) {
        this.averagePrice = averagePrice;
    }

    public BigDecimal getTotalInvestment() {
        return totalInvestment;
    }

    public void setTotalInvestment(BigDecimal totalInvestment) {
        this.totalInvestment = totalInvestment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
