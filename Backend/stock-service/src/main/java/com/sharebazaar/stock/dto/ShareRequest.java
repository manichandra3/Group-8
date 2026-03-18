package com.sharebazaar.stock.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class ShareRequest {

    @NotNull(message = "Company ID is required")
    private Long companyId;

    @NotNull(message = "Total shares is required")
    @Min(value = 1, message = "Total shares must be at least 1")
    private Long totalShares;

    @NotNull(message = "Available shares is required")
    @Min(value = 0, message = "Available shares cannot be negative")
    private Long availableShares;

    @NotNull(message = "Price per share is required")
    @DecimalMin(value = "0.01", message = "Price per share must be at least 0.01")
    private BigDecimal pricePerShare;

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
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
}
