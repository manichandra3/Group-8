package com.sharebazaar.stock.controller;

import com.sharebazaar.stock.dto.PriceTick;
import com.sharebazaar.stock.service.PriceSimulatorService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Called once on page load so React has current prices
 * before the first WebSocket tick arrives (3 second delay).
 */
@RestController
@RequestMapping("/api/prices")
public class PriceSnapshotController {

    private final PriceSimulatorService simulator;

    public PriceSnapshotController(PriceSimulatorService simulator) {
        this.simulator = simulator;
    }

    /** Returns latest PriceTick for every share. */
    @GetMapping("/snapshot")
    public Map<Long, java.math.BigDecimal> snapshot() {
        return simulator.getAllCurrentPrices();
    }

    /** Returns latest PriceTick for a single share. */
    @GetMapping("/{shareId}")
    public PriceTick latest(@PathVariable Long shareId) {
        PriceTick tick = simulator.getLatest(shareId);
        if (tick == null) {
            throw new RuntimeException("Share not found in simulator: " + shareId);
        }
        return tick;
    }
}