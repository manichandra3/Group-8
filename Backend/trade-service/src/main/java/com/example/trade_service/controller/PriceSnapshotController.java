package com.example.trade_service.controller;

import com.example.trade_service.domain.Company;
import com.example.trade_service.dto.PriceTick;
import com.example.trade_service.repository.CompanyRepository;
import com.example.trade_service.stream.PriceCache;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/prices")
public class PriceSnapshotController {

    @Autowired
    private CompanyRepository companyRepo;

    @Autowired
    private PriceCache priceCache;

    @GetMapping("/snapshot")
    public List<PriceTick> snapshot() {

        List<Company> companies = companyRepo.findAll();

        return companies.stream().map(company -> {

            // Use cached price first, fall back to DB lastPrice
            double price = priceCache.getPrice(company.getId());
            if (price == 0) price = company.getLastPrice();

            // If openingPrice was never set, treat current price as open
            double open = company.getOpeningPrice();
            if (open == 0) open = price;

            // ── FIX: dayHigh / dayLow are 0 for newly added companies ─────────
            // When 0, the MarketEngine hasn't had a chance to set them yet.
            // Fall back to current price so frontend range bar never breaks.
            double high = company.getDayHigh();
            double low  = company.getDayLow();

            if (high == 0 || high < price) high = price;
            if (low  == 0 || low  > price) low  = price;

            double dayChangePct = open == 0 ? 0.0 : ((price - open) / open) * 100.0;

            return new PriceTick(
                    company.getId(),
                    company.getName(),
                    price,
                    open,
                    high,
                    low,
                    dayChangePct,
                    0.0
            );

        }).collect(Collectors.toList());
    }
}