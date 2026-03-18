package com.sharebazaar.stock.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ShareResponse {

    private Long id;
    private Long companyId;
    private String companyName;
    private String companySymbol;
    private Long totalShares;
    private Long availableShares;
    private BigDecimal pricePerShare;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ShareResponse() {
    }

    public ShareResponse(Long id, Long companyId, String companyName, String companySymbol,
                         Long totalShares, Long availableShares, BigDecimal pricePerShare,
                         LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.companyId = companyId;
        this.companyName = companyName;
        this.companySymbol = companySymbol;
        this.totalShares = totalShares;
        this.availableShares = availableShares;
        this.pricePerShare = pricePerShare;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getCompanySymbol() {
        return companySymbol;
    }

    public void setCompanySymbol(String companySymbol) {
        this.companySymbol = companySymbol;
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

    public BigDecimal getPricePerShare() {
        return pricePerShare;
    }

    public void setPricePerShare(BigDecimal pricePerShare) {
        this.pricePerShare = pricePerShare;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
