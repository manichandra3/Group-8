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
    private final WalletService walletService;

    public TransactionService(PortfolioRepository portfolioRepository,
                              HoldingRepository holdingRepository,
                              StockRepository stockRepository,
                              TransactionRepository transactionRepository,
                              WalletService walletService) {
        this.portfolioRepository = portfolioRepository;
        this.holdingRepository   = holdingRepository;
        this.stockRepository     = stockRepository;
        this.transactionRepository = transactionRepository;
        this.walletService       = walletService;
    }

    @Transactional
    public Transaction buyShares(Long userId, Long portfolioId,
                                 String companySymbol, Long quantity,
                                 BigDecimal pricePerShare) {

        // 1. Validate portfolio ownership
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new RuntimeException("Portfolio not found with id: " + portfolioId));

        if (!portfolio.getCustomer().getUserId().equals(userId))
            throw new RuntimeException("Access denied — portfolio does not belong to this user");

        // 2. Check wallet balance BEFORE touching stock inventory
        BigDecimal totalCost = pricePerShare.multiply(BigDecimal.valueOf(quantity));
        BigDecimal balance   = walletService.getBalance(userId);

        if (balance.compareTo(totalCost) < 0)
            throw new RuntimeException(
                    "Insufficient wallet balance. Required: ₹" + totalCost +
                            ", Available: ₹" + balance +
                            ". Please add funds from the Profile → Wallet section."
            );

        // 3. Lock stock and validate available shares
        Stock stock = stockRepository.findByCompanySymbolWithLock(companySymbol)
                .orElseThrow(() -> new RuntimeException("Stock not found with symbol: " + companySymbol));

        if (stock.getAvailableShares() < quantity)
            throw new RuntimeException("Insufficient shares available. Available: " +
                    stock.getAvailableShares() + ", Requested: " + quantity);

        // 4. Deduct wallet balance
        walletService.withdraw(userId, totalCost);

        // 5. Update stock inventory
        stock.recordBuy(quantity);
        stockRepository.save(stock);

        // 6. Update or create holding with weighted average price
        Holding holding = holdingRepository
                .findByPortfolioIdAndCompanyId(portfolioId, stock.getCompanyId())
                .orElse(new Holding(portfolio, stock.getCompanyId(),
                        stock.getCompanySymbol(), stock.getCompanyName()));
        holding.addShares(quantity, pricePerShare);
        holdingRepository.save(holding);

        // 7. Record transaction
        Transaction transaction = new Transaction(
                portfolio, stock.getCompanyId(), stock.getCompanySymbol(), stock.getCompanyName(),
                Transaction.TransactionType.BUY, quantity, pricePerShare
        );
        return transactionRepository.save(transaction);
    }

    @Transactional
    public Transaction sellShares(Long userId, Long portfolioId,
                                  String companySymbol, Long quantity,
                                  BigDecimal pricePerShare) {

        // 1. Validate portfolio ownership
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new RuntimeException("Portfolio not found with id: " + portfolioId));

        if (!portfolio.getCustomer().getUserId().equals(userId))
            throw new RuntimeException("Access denied — portfolio does not belong to this user");

        // 2. Lock stock
        Stock stock = stockRepository.findByCompanySymbolWithLock(companySymbol)
                .orElseThrow(() -> new RuntimeException("Stock not found with symbol: " + companySymbol));

        // 3. Validate holding
        Holding holding = holdingRepository
                .findByPortfolioIdAndCompanyId(portfolioId, stock.getCompanyId())
                .orElseThrow(() -> new RuntimeException("No holding found for company: " + companySymbol));

        if (holding.getQuantity() < quantity)
            throw new RuntimeException("Cannot sell more shares than held. Held: " +
                    holding.getQuantity() + ", Requested: " + quantity);

        // 4. Update stock inventory
        stock.recordSell(quantity);
        stockRepository.save(stock);

        // 5. Remove shares from holding
        holding.removeShares(quantity);
        holdingRepository.save(holding);

        // 6. Credit sale proceeds back to wallet
        BigDecimal saleProceeds = pricePerShare.multiply(BigDecimal.valueOf(quantity));
        walletService.deposit(userId, saleProceeds);

        // 7. Record transaction
        Transaction transaction = new Transaction(
                portfolio, stock.getCompanyId(), stock.getCompanySymbol(), stock.getCompanyName(),
                Transaction.TransactionType.SELL, quantity, pricePerShare
        );
        return transactionRepository.save(transaction);
    }
}