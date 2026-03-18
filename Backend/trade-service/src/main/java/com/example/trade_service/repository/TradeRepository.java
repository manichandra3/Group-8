package com.example.trade_service.repository;

import com.example.trade_service.domain.Trade;
import com.example.trade_service.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TradeRepository extends JpaRepository<Trade, Long> {

    // 🔥 for execution engine
    List<Trade> findByStatus(OrderStatus status);

    // 🔥 optimized matching
    List<Trade> findByStatusAndCompanyId(OrderStatus status, Long companyId);

    // 🔥 portfolio (future)
    List<Trade> findByUserId(Long userId);
    List<Trade> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Trade> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
}