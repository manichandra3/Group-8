package com.sharebazaar.portfolio.service;

import com.sharebazaar.portfolio.domain.Customer;
import com.sharebazaar.portfolio.domain.Holding;
import com.sharebazaar.portfolio.domain.Portfolio;
import com.sharebazaar.portfolio.dto.HoldingResponse;
import com.sharebazaar.portfolio.dto.PortfolioRequest;
import com.sharebazaar.portfolio.dto.PortfolioResponse;
import com.sharebazaar.portfolio.repository.CustomerRepository;
import com.sharebazaar.portfolio.repository.HoldingRepository;
import com.sharebazaar.portfolio.repository.PortfolioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final CustomerRepository customerRepository;
    private final HoldingRepository holdingRepository;

    public PortfolioService(PortfolioRepository portfolioRepository,
                           CustomerRepository customerRepository,
                           HoldingRepository holdingRepository) {
        this.portfolioRepository = portfolioRepository;
        this.customerRepository = customerRepository;
        this.holdingRepository = holdingRepository;
    }

    @Transactional
    public PortfolioResponse createPortfolio(Long userId, String userEmail, PortfolioRequest request) {
        // Get or create customer
        Customer customer = customerRepository.findByUserId(userId)
            .orElseGet(() -> {
                Customer newCustomer = new Customer(userId, userEmail, userEmail);
                return customerRepository.save(newCustomer);
            });

        Portfolio portfolio = new Portfolio(customer, request.getName());
        portfolio.setDescription(request.getDescription());
        
        portfolio = portfolioRepository.save(portfolio);
        
        return mapToResponse(portfolio);
    }

    @Transactional
    public List<PortfolioResponse> getCustomerPortfolios(Long userId, String userEmail) {
        Customer customer = customerRepository.findByUserId(userId)
            .orElseGet(() -> {
                Customer newCustomer = new Customer();
                newCustomer.setUserId(userId);
                newCustomer.setEmail(userEmail);
                newCustomer.setName(userEmail); // Using email as name for now
                return customerRepository.save(newCustomer);
            });

        return portfolioRepository.findByCustomerIdAndActiveTrue(customer.getId())
            .stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PortfolioResponse getPortfolioById(Long portfolioId, Long userId) {
        Customer customer = customerRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Customer not found for user id: " + userId));

        Portfolio portfolio = portfolioRepository.findByIdAndCustomerId(portfolioId, customer.getId())
            .orElseThrow(() -> new RuntimeException("Portfolio not found with id: " + portfolioId));

        return mapToResponse(portfolio);
    }

    @Transactional
    public PortfolioResponse updatePortfolio(Long portfolioId, Long userId, PortfolioRequest request) {
        Customer customer = customerRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Customer not found for user id: " + userId));

        Portfolio portfolio = portfolioRepository.findByIdAndCustomerId(portfolioId, customer.getId())
            .orElseThrow(() -> new RuntimeException("Portfolio not found with id: " + portfolioId));

        portfolio.setName(request.getName());
        portfolio.setDescription(request.getDescription());
        
        portfolio = portfolioRepository.save(portfolio);
        
        return mapToResponse(portfolio);
    }

    @Transactional
    public void deletePortfolio(Long portfolioId, Long userId) {
        Customer customer = customerRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Customer not found for user id: " + userId));

        Portfolio portfolio = portfolioRepository.findByIdAndCustomerId(portfolioId, customer.getId())
            .orElseThrow(() -> new RuntimeException("Portfolio not found with id: " + portfolioId));

        portfolio.setActive(false);
        portfolioRepository.save(portfolio);
    }

    private PortfolioResponse mapToResponse(Portfolio portfolio) {
        PortfolioResponse response = new PortfolioResponse();
        response.setId(portfolio.getId());
        response.setName(portfolio.getName());
        response.setDescription(portfolio.getDescription());
        response.setActive(portfolio.isActive());
        response.setCreatedAt(portfolio.getCreatedAt());
        response.setUpdatedAt(portfolio.getUpdatedAt());

        // Load holdings
        List<Holding> holdings = holdingRepository.findByPortfolioIdAndQuantityGreaterThan(portfolio.getId(), 0L);
        response.setHoldings(holdings.stream()
            .map(this::mapHoldingToResponse)
            .collect(Collectors.toList()));

        return response;
    }

    private HoldingResponse mapHoldingToResponse(Holding holding) {
        HoldingResponse response = new HoldingResponse();
        response.setId(holding.getId());
        response.setCompanyId(holding.getCompanyId());
        response.setCompanySymbol(holding.getCompanySymbol());
        response.setCompanyName(holding.getCompanyName());
        response.setQuantity(holding.getQuantity());
        response.setAveragePrice(holding.getAveragePrice());
        response.setTotalInvestment(holding.getTotalInvestment());
        response.setCreatedAt(holding.getCreatedAt());
        response.setUpdatedAt(holding.getUpdatedAt());
        return response;
    }
}
