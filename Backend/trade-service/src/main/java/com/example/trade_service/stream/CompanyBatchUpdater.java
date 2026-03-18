package com.example.trade_service.stream;

import com.example.trade_service.domain.Company;
import com.example.trade_service.repository.CompanyRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class CompanyBatchUpdater {

    @Autowired
    private CompanyRepository companyRepo;

    @Autowired
    private PriceCache priceCache;

    @Scheduled(fixedRate = 10000) // every 10 sec
    public void updateDatabase() {

        List<Company> companies = companyRepo.findAll();
        Map<Long, Double> prices = priceCache.getAllPrices();

        for (Company company : companies) {

            Double latestPrice = prices.get(company.getId());
            if (latestPrice == null) continue;

            company.setLastPrice(latestPrice);
        }

        companyRepo.saveAll(companies);

        System.out.println("Batch DB update done");
    }
}