package com.sharebazaar.portfolio.repository;

import com.sharebazaar.portfolio.domain.Stock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {
    
    Optional<Stock> findByCompanyId(Long companyId);
    
    Optional<Stock> findByCompanySymbol(String companySymbol);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Stock s WHERE s.companyId = :companyId")
    Optional<Stock> findByCompanyIdWithLock(@Param("companyId") Long companyId);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Stock s WHERE s.companySymbol = :symbol")
    Optional<Stock> findByCompanySymbolWithLock(@Param("symbol") String symbol);

//    Optional<Stock> findByCompanySymbol(String companySymbol);
//
//    // Added — needed by StockSyncService to match by companyId before symbol
//    // This prevents duplicate key errors when DataSeeder already seeded the row
//    Optional<Stock> findByCompanyId(Long companyId);
//
//    @Lock(LockModeType.PESSIMISTIC_WRITE)
//    @Query("SELECT s FROM Stock s WHERE s.companySymbol = :symbol")
//    Optional<Stock> findByCompanySymbolWithLock(@Param("symbol") String symbol);

}
