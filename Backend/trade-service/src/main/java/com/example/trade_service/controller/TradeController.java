package com.example.trade_service.controller;

import com.example.trade_service.domain.Trade;
import com.example.trade_service.dto.TradeRequest;
import com.example.trade_service.service.TradeService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/trade")
public class TradeController {

    @Autowired
    private TradeService service;

    @PostMapping("/buy")
    public Trade buy(@RequestBody TradeRequest req) {
        return service.placeOrder(req, "BUY");
    }

    @PostMapping("/sell")
    public Trade sell(@RequestBody TradeRequest req) {
        return service.placeOrder(req, "SELL");
    }
}