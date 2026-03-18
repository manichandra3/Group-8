package com.example.trade_service.controller;

import com.example.trade_service.domain.Company;
import com.example.trade_service.dto.PriceTick;
import com.example.trade_service.repository.CompanyRepository;
import com.example.trade_service.stream.PriceCache;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Called once when React mounts, so the frontend has current prices
 * immediately without waiting for the first WebSocket tick (1s delay).
 *
 * GET /api/prices/snapshot
 * Returns a list of PriceTick — one per company.
 */
@RestController
@RequestMapping("/api/prices")
@CrossOrigin(origins = "http://localhost:5173")
public class PriceSnapshotController {

    @Autowired
    private CompanyRepository companyRepo;

    @Autowired
    private PriceCache priceCache;

    @GetMapping("/snapshot")
    public List<PriceTick> snapshot() {

        List<Company> companies = companyRepo.findAll();

        return companies.stream().map(company -> {

            double price = priceCache.getPrice(company.getId());
            if (price == 0) price = company.getLastPrice();

            double open        = company.getOpeningPrice();
            double dayChangePct = open == 0 ? 0 : ((price - open) / open) * 100.0;

            return new PriceTick(
                    company.getId(),
                    company.getName(),
                    price,
                    open,
                    company.getDayHigh(),
                    company.getDayLow() == 0 ? price : company.getDayLow(),
                    dayChangePct,
                    0.0   // no previous tick at snapshot time
            );

        }).collect(Collectors.toList());
    }
}