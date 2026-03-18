package com.example.trade_service.controller;

import com.example.trade_service.sync.CompanySyncService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = "http://localhost:5173")
public class SyncController {

    @Autowired
    private CompanySyncService companySyncService;

    @PostMapping("/sync")
    public String sync() {
        companySyncService.sync();
        return "Sync triggered";
    }
}