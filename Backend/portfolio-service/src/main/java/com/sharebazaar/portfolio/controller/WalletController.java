package com.sharebazaar.portfolio.controller;

import com.sharebazaar.portfolio.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    /** GET /api/wallet/balance — returns current wallet balance */
    @GetMapping("/balance")
    public ResponseEntity<Map<String, Object>> getBalance(
            @RequestHeader("X-User-Id") Long userId) {
        BigDecimal balance = walletService.getBalance(userId);
        return ResponseEntity.ok(Map.of(
                "userId",  userId,
                "balance", balance
        ));
    }

    /** POST /api/wallet/deposit — add funds to wallet */
    @PostMapping("/deposit")
    public ResponseEntity<Map<String, Object>> deposit(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, Object> body) {

        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        if (amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new RuntimeException("Deposit amount must be greater than zero");

        BigDecimal newBalance = walletService.deposit(userId, amount);
        return ResponseEntity.ok(Map.of(
                "userId",     userId,
                "deposited",  amount,
                "balance",    newBalance,
                "message",    "₹" + amount + " added to your wallet"
        ));
    }

    /** POST /api/wallet/withdraw — deduct funds (used internally by trade) */
    @PostMapping("/withdraw")
    public ResponseEntity<Map<String, Object>> withdraw(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, Object> body) {

        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        if (amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new RuntimeException("Withdraw amount must be greater than zero");

        BigDecimal newBalance = walletService.withdraw(userId, amount);
        return ResponseEntity.ok(Map.of(
                "userId",    userId,
                "withdrawn", amount,
                "balance",   newBalance
        ));
    }
}