package com.sharebazaar.portfolio.repository;

import com.sharebazaar.portfolio.domain.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    
    List<Transaction> findByPortfolioId(Long portfolioId);
    
    List<Transaction> findByPortfolioIdOrderByTransactionDateDesc(Long portfolioId);
    
    List<Transaction> findByPortfolioIdAndTransactionDateBetween(
        Long portfolioId, LocalDateTime startDate, LocalDateTime endDate);
}
