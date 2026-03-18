package com.example.trade_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class TradeServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TradeServiceApplication.class, args);
    }
}