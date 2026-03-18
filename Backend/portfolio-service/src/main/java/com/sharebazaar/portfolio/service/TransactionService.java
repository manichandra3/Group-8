package com.sharebazaar.portfolio.service;

import com.sharebazaar.portfolio.domain.Holding;
import com.sharebazaar.portfolio.domain.Portfolio;
import com.sharebazaar.portfolio.domain.Stock;
import com.sharebazaar.portfolio.domain.Transaction;
import com.sharebazaar.portfolio.repository.HoldingRepository;
import com.sharebazaar.portfolio.repository.PortfolioRepository;
import com.sharebazaar.portfolio.repository.StockRepository;
import com.sharebazaar.portfolio.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class TransactionService {

    private final PortfolioRepository portfolioRepository;
    private final HoldingRepository holdingRepository;
    private final StockRepository stockRepository;
    private final TransactionRepository transactionRepository;

    public TransactionService(PortfolioRepository portfolioRepository,
                              HoldingRepository holdingRepository,
                              StockRepository stockRepository,
                              TransactionRepository transactionRepository) {
        this.portfolioRepository = portfolioRepository;
        this.holdingRepository = holdingRepository;
        this.stockRepository = stockRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public Transaction buyShares(Long userId, Long portfolioId, String companySymbol, Long quantity, BigDecimal pricePerShare) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new RuntimeException("Portfolio not found with id: " + portfolioId));

        // Ownership check — portfolio must belong to requesting user
        if (!portfolio.getCustomer().getUserId().equals(userId)) {
            throw new RuntimeException("Access denied — portfolio does not belong to this user");
        }

        Stock stock = stockRepository.findByCompanySymbolWithLock(companySymbol)
                .orElseThrow(() -> new RuntimeException("Stock not found with symbol: " + companySymbol));

        if (stock.getAvailableShares() < quantity) {
            throw new RuntimeException("Insufficient shares available. Available: " +
                    stock.getAvailableShares() + ", Requested: " + quantity);
        }

        stock.recordBuy(quantity);
        stockRepository.save(stock);

        Holding holding = holdingRepository
                .findByPortfolioIdAndCompanyId(portfolioId, stock.getCompanyId())
                .orElse(new Holding(portfolio, stock.getCompanyId(), stock.getCompanySymbol(), stock.getCompanyName()));

        holding.addShares(quantity, pricePerShare);
        holdingRepository.save(holding);

        Transaction transaction = new Transaction(
                portfolio, stock.getCompanyId(), stock.getCompanySymbol(), stock.getCompanyName(),
                Transaction.TransactionType.BUY, quantity, pricePerShare
        );
        return transactionRepository.save(transaction);
    }

    @Transactional
    public Transaction sellShares(Long userId, Long portfolioId, String companySymbol, Long quantity, BigDecimal pricePerShare) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new RuntimeException("Portfolio not found with id: " + portfolioId));

        // Ownership check — portfolio must belong to requesting user
        if (!portfolio.getCustomer().getUserId().equals(userId)) {
            throw new RuntimeException("Access denied — portfolio does not belong to this user");
        }

        Stock stock = stockRepository.findByCompanySymbolWithLock(companySymbol)
                .orElseThrow(() -> new RuntimeException("Stock not found with symbol: " + companySymbol));

        Holding holding = holdingRepository
                .findByPortfolioIdAndCompanyId(portfolioId, stock.getCompanyId())
                .orElseThrow(() -> new RuntimeException("No holding found for company: " + companySymbol));

        if (holding.getQuantity() < quantity) {
            throw new RuntimeException("Cannot sell more shares than held. Held: " +
                    holding.getQuantity() + ", Requested: " + quantity);
        }

        stock.recordSell(quantity);
        stockRepository.save(stock);

        holding.removeShares(quantity);
        holdingRepository.save(holding);

        Transaction transaction = new Transaction(
                portfolio, stock.getCompanyId(), stock.getCompanySymbol(), stock.getCompanyName(),
                Transaction.TransactionType.SELL, quantity, pricePerShare
        );
        return transactionRepository.save(transaction);
    }
}