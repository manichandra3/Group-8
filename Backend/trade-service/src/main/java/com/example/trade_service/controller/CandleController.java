package com.example.trade_service.controller;

import com.example.trade_service.domain.Candle;
import com.example.trade_service.repository.CandleRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/candles")
@CrossOrigin(origins = "http://localhost:5173")   // ← was missing, browser was blocking it
public class CandleController {

    @Autowired
    private CandleRepository repo;

    @GetMapping("/{companyId}")
    public List<Candle> get(@PathVariable Long companyId) {
        return repo.findByCompanyIdOrderByStartTimeAsc(companyId);
    }
}