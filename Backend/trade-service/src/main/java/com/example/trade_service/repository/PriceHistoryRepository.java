package com.example.trade_service.repository;

import com.example.trade_service.domain.PriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {

    List<PriceHistory> findTop100ByCompanyIdOrderByTimestampDesc(Long companyId);

    List<PriceHistory> findByCompanyIdOrderByTimestampAsc(Long companyId);
}