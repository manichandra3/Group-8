package com.sharebazaar.portfolio.repository;

import com.sharebazaar.portfolio.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    
    Optional<Customer> findByUserId(Long userId);
    
    Optional<Customer> findByEmail(String email);
    
    boolean existsByUserId(Long userId);
}
