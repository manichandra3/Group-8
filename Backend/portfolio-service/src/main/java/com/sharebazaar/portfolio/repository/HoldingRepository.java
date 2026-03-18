package com.sharebazaar.portfolio.repository;

import com.sharebazaar.portfolio.domain.Holding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HoldingRepository extends JpaRepository<Holding, Long> {
    
    List<Holding> findByPortfolioId(Long portfolioId);
    
    Optional<Holding> findByPortfolioIdAndCompanyId(Long portfolioId, Long companyId);
    
    List<Holding> findByPortfolioIdAndQuantityGreaterThan(Long portfolioId, Long quantity);
}
