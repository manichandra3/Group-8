package com.sharebazaar.stock.repository;

import com.sharebazaar.stock.domain.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {

    Optional<Company> findBySymbol(String symbol);

    boolean existsByName(String name);

    boolean existsBySymbol(String symbol);
}
