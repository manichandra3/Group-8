package com.sharebazaar.portfolio.controller;

import com.sharebazaar.portfolio.domain.Transaction;
import com.sharebazaar.portfolio.dto.BuySharesRequest;
import com.sharebazaar.portfolio.dto.SellSharesRequest;
import com.sharebazaar.portfolio.dto.TransactionResponse;
import com.sharebazaar.portfolio.repository.TransactionRepository;
import com.sharebazaar.portfolio.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;

    public TransactionController(TransactionService transactionService,
                                 TransactionRepository transactionRepository) {
        this.transactionService = transactionService;
        this.transactionRepository = transactionRepository;
    }

    @PostMapping("/buy")
    public ResponseEntity<TransactionResponse> buyShares(
            @Valid @RequestBody BuySharesRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        Transaction transaction = transactionService.buyShares(
                userId,
                request.getPortfolioId(),
                request.getCompanySymbol(),
                request.getQuantity(),
                request.getPricePerShare()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(transaction));
    }

    @PostMapping("/sell")
    public ResponseEntity<TransactionResponse> sellShares(
            @Valid @RequestBody SellSharesRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        Transaction transaction = transactionService.sellShares(
                userId,
                request.getPortfolioId(),
                request.getCompanySymbol(),
                request.getQuantity(),
                request.getPricePerShare()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(transaction));
    }

    @GetMapping("/portfolio/{portfolioId}")
    public ResponseEntity<List<TransactionResponse>> getPortfolioTransactions(
            @PathVariable Long portfolioId,
            @RequestHeader("X-User-Id") Long userId) {
        List<Transaction> transactions = transactionRepository
                .findByPortfolioIdOrderByTransactionDateDesc(portfolioId);
        List<TransactionResponse> response = transactions.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    private TransactionResponse mapToResponse(Transaction transaction) {
        TransactionResponse response = new TransactionResponse();
        response.setId(transaction.getId());
        response.setPortfolioId(transaction.getPortfolio().getId());
        response.setPortfolioName(transaction.getPortfolio().getName());
        response.setCompanyId(transaction.getCompanyId());
        response.setCompanySymbol(transaction.getCompanySymbol());
        response.setCompanyName(transaction.getCompanyName());
        response.setTransactionType(transaction.getTransactionType().name());
        response.setQuantity(transaction.getQuantity());
        response.setPricePerShare(transaction.getPricePerShare());
        response.setTotalAmount(transaction.getTotalAmount());
        response.setTransactionDate(transaction.getTransactionDate());
        return response;
    }
}