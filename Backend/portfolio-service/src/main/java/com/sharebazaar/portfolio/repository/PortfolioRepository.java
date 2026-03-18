package com.sharebazaar.portfolio.repository;

import com.sharebazaar.portfolio.domain.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    
    List<Portfolio> findByCustomerId(Long customerId);
    
    List<Portfolio> findByCustomerIdAndActiveTrue(Long customerId);
    
    Optional<Portfolio> findByIdAndCustomerId(Long id, Long customerId);
}
