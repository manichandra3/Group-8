package com.example.trade_service.controller;

import com.example.trade_service.domain.Trade;
import com.example.trade_service.dto.TradeRequest;
import com.example.trade_service.repository.TradeRepository;
import com.example.trade_service.service.TradeService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/trade")
@CrossOrigin(origins = "http://localhost:5173")
public class TradeController {

    @Autowired
    private TradeService service;

    @Autowired
    private TradeRepository tradeRepository;

    @PostMapping("/buy")
    public Trade buy(@RequestBody TradeRequest req) {
        return service.placeOrder(req, "BUY");
    }

    @PostMapping("/sell")
    public Trade sell(@RequestBody TradeRequest req) {
        return service.placeOrder(req, "SELL");
    }

    // ── GET all orders for a user ─────────────────────────────────────────────
    @GetMapping("/user/{userId}")
    public List<Trade> getByUser(@PathVariable Long userId) {
        return tradeRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // ── GET all orders for a company (useful for admin) ───────────────────────
    @GetMapping("/company/{companyId}")
    public List<Trade> getByCompany(@PathVariable Long companyId) {
        return tradeRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }
}