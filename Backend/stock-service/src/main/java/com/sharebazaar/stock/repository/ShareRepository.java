package com.sharebazaar.stock.repository;

import com.sharebazaar.stock.domain.Share;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShareRepository extends JpaRepository<Share, Long> {

    Optional<Share> findByCompanyId(Long companyId);

    boolean existsByCompanyId(Long companyId);
    void deleteByCompanyId(Long companyId);
}
