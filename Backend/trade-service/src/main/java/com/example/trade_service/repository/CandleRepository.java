package com.example.trade_service.repository;

import com.example.trade_service.domain.Candle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CandleRepository extends JpaRepository<Candle, Long> {

    List<Candle> findTop100ByCompanyIdOrderByStartTimeDesc(Long companyId);

    List<Candle> findByCompanyIdOrderByStartTimeAsc(Long companyId);
}