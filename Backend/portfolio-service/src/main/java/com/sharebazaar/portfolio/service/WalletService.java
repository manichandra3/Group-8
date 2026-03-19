package com.sharebazaar.portfolio.service;

import com.sharebazaar.portfolio.domain.Customer;
import com.sharebazaar.portfolio.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class WalletService {

    private final CustomerRepository customerRepository;

    public WalletService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Transactional(readOnly = true)
    public BigDecimal getBalance(Long userId) {
        Customer customer = getOrThrow(userId);
        return customer.getWalletBalance();
    }

    @Transactional
    public BigDecimal deposit(Long userId, BigDecimal amount) {
        Customer customer = getOrThrow(userId);
        BigDecimal newBalance = customer.getWalletBalance().add(amount);
        customer.setWalletBalance(newBalance);
        customerRepository.save(customer);
        return newBalance;
    }

    @Transactional
    public BigDecimal withdraw(Long userId, BigDecimal amount) {
        Customer customer = getOrThrow(userId);
        if (customer.getWalletBalance().compareTo(amount) < 0)
            throw new RuntimeException("Insufficient wallet balance. Available: ₹" + customer.getWalletBalance());
        BigDecimal newBalance = customer.getWalletBalance().subtract(amount);
        customer.setWalletBalance(newBalance);
        customerRepository.save(customer);
        return newBalance;
    }

    private Customer getOrThrow(Long userId) {
        return customerRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException(
                        "Wallet not found for user " + userId +
                                " — create a portfolio first to initialise your account"));
    }
}