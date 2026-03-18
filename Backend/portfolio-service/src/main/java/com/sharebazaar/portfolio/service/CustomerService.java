package com.sharebazaar.portfolio.service;

import com.sharebazaar.portfolio.domain.Customer;
import com.sharebazaar.portfolio.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Transactional
    public Customer getOrCreateCustomer(Long userId, String name, String email) {
        return customerRepository.findByUserId(userId)
            .orElseGet(() -> {
                Customer customer = new Customer(userId, name, email);
                return customerRepository.save(customer);
            });
    }

    @Transactional(readOnly = true)
    public Customer getCustomerByUserId(Long userId) {
        return customerRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Customer not found for user id: " + userId));
    }
}
