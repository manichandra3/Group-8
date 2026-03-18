package com.sharebazaar.portfolio.service;

import com.sharebazaar.portfolio.domain.Customer;
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

    /**
     * Buy shares - implements weighted average price calculation and transactional integrity
     */
    @Transactional
    public Transaction buyShares(Long portfolioId, String companySymbol, Long quantity, BigDecimal pricePerShare) {
        // 1. Get and validate portfolio
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
            .orElseThrow(() -> new RuntimeException("Portfolio not found with id: " + portfolioId));

        // 2. Get stock with pessimistic lock to prevent concurrent modification
        Stock stock = stockRepository.findByCompanySymbolWithLock(companySymbol)
            .orElseThrow(() -> new RuntimeException("Stock not found with symbol: " + companySymbol));

        // 3. Check if enough shares are available
        if (stock.getAvailableShares() < quantity) {
            throw new RuntimeException("Insufficient shares available. Available: " + 
                stock.getAvailableShares() + ", Requested: " + quantity);
        }

        // 4. Update stock inventory (decrease available, increase total bought)
        stock.recordBuy(quantity);
        stockRepository.save(stock);

        // 5. Get or create holding for this company in the portfolio
        Holding holding = holdingRepository
            .findByPortfolioIdAndCompanyId(portfolioId, stock.getCompanyId())
            .orElse(new Holding(portfolio, stock.getCompanyId(), stock.getCompanySymbol(), stock.getCompanyName()));

        // 6. Add shares with weighted average price calculation
        holding.addShares(quantity, pricePerShare);
        holdingRepository.save(holding);

        // 7. Record transaction
        Transaction transaction = new Transaction(
            portfolio,
            stock.getCompanyId(),
            stock.getCompanySymbol(),
            stock.getCompanyName(),
            Transaction.TransactionType.BUY,
            quantity,
            pricePerShare
        );
        return transactionRepository.save(transaction);
    }

    /**
     * Sell shares - prevents over-selling and maintains transactional integrity
     */
    @Transactional
    public Transaction sellShares(Long portfolioId, String companySymbol, Long quantity, BigDecimal pricePerShare) {
        // 1. Get and validate portfolio
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
            .orElseThrow(() -> new RuntimeException("Portfolio not found with id: " + portfolioId));

        // 2. Get stock with pessimistic lock
        Stock stock = stockRepository.findByCompanySymbolWithLock(companySymbol)
            .orElseThrow(() -> new RuntimeException("Stock not found with symbol: " + companySymbol));

        // 3. Get holding and validate sufficient shares
        Holding holding = holdingRepository
            .findByPortfolioIdAndCompanyId(portfolioId, stock.getCompanyId())
            .orElseThrow(() -> new RuntimeException("No holding found for company: " + companySymbol));

        // 4. Prevent over-selling
        if (holding.getQuantity() < quantity) {
            throw new RuntimeException("Cannot sell more shares than held. Held: " + 
                holding.getQuantity() + ", Requested: " + quantity);
        }

        // 5. Update stock inventory (increase available, decrease total bought)
        stock.recordSell(quantity);
        stockRepository.save(stock);

        // 6. Remove shares from holding
        holding.removeShares(quantity);
        holdingRepository.save(holding);

        // 7. Record transaction
        Transaction transaction = new Transaction(
            portfolio,
            stock.getCompanyId(),
            stock.getCompanySymbol(),
            stock.getCompanyName(),
            Transaction.TransactionType.SELL,
            quantity,
            pricePerShare
        );
        return transactionRepository.save(transaction);
    }
}
