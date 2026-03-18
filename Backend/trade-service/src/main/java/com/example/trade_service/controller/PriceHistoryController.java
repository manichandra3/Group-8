package com.example.trade_service.controller;

import com.example.trade_service.domain.PriceHistory;
import com.example.trade_service.repository.PriceHistoryRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/price-history")
public class PriceHistoryController {

    @Autowired
    private PriceHistoryRepository repo;

    @GetMapping("/{companyId}")
    public List<PriceHistory> getHistory(@PathVariable Long companyId) {
        return repo.findByCompanyIdOrderByTimestampAsc(companyId);
    }
}