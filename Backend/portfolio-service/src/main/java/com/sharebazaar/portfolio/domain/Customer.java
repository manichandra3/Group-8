package com.sharebazaar.portfolio.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    /** Virtual wallet balance — starts at 0, user deposits manually */
    @Column(name = "wallet_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal walletBalance = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public Customer() {}

    public Customer(Long userId, String name, String email) {
        this.userId = userId;
        this.name   = name;
        this.email  = email;
    }

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long getId()                              { return id; }
    public void setId(Long id)                       { this.id = id; }

    public Long getUserId()                          { return userId; }
    public void setUserId(Long userId)               { this.userId = userId; }

    public String getName()                          { return name; }
    public void setName(String name)                 { this.name = name; }

    public String getEmail()                         { return email; }
    public void setEmail(String email)               { this.email = email; }

    public String getPhoneNumber()                   { return phoneNumber; }
    public void setPhoneNumber(String p)             { this.phoneNumber = p; }

    public BigDecimal getWalletBalance()             { return walletBalance; }
    public void setWalletBalance(BigDecimal b)       { this.walletBalance = b; }

    public boolean isActive()                        { return active; }
    public void setActive(boolean active)            { this.active = active; }

    public LocalDateTime getCreatedAt()              { return createdAt; }
    public LocalDateTime getUpdatedAt()              { return updatedAt; }
}