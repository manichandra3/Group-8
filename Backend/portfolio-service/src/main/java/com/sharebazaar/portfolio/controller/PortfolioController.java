package com.sharebazaar.portfolio.controller;

import com.sharebazaar.portfolio.dto.PortfolioRequest;
import com.sharebazaar.portfolio.dto.PortfolioResponse;
import com.sharebazaar.portfolio.service.PortfolioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/portfolios")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @PostMapping
    public ResponseEntity<PortfolioResponse> createPortfolio(
            @Valid @RequestBody PortfolioRequest request,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader(value = "X-User-Name", defaultValue = "") String userName,
            @RequestHeader(value = "X-User-Email", defaultValue = "") String userEmail) {
        PortfolioResponse response = portfolioService.createPortfolio(userId, userName, userEmail, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<PortfolioResponse>> getMyPortfolios(
            @RequestHeader("X-User-Id") Long userId) {
        List<PortfolioResponse> portfolios = portfolioService.getCustomerPortfolios(userId);
        return ResponseEntity.ok(portfolios);
    }

    @GetMapping("/{portfolioId}")
    public ResponseEntity<PortfolioResponse> getPortfolioById(
            @PathVariable Long portfolioId,
            @RequestHeader("X-User-Id") Long userId) {
        PortfolioResponse response = portfolioService.getPortfolioById(portfolioId, userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{portfolioId}")
    public ResponseEntity<PortfolioResponse> updatePortfolio(
            @PathVariable Long portfolioId,
            @Valid @RequestBody PortfolioRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        PortfolioResponse response = portfolioService.updatePortfolio(portfolioId, userId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{portfolioId}")
    public ResponseEntity<Void> deletePortfolio(
            @PathVariable Long portfolioId,
            @RequestHeader("X-User-Id") Long userId) {
        portfolioService.deletePortfolio(portfolioId, userId);
        return ResponseEntity.noContent().build();
    }
}