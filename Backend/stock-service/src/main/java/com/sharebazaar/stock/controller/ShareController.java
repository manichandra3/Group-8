package com.sharebazaar.stock.controller;

import com.sharebazaar.stock.domain.SharePriceHistory;
import com.sharebazaar.stock.dto.ShareRequest;
import com.sharebazaar.stock.dto.ShareResponse;
import com.sharebazaar.stock.dto.ShareUpdateRequest;
import com.sharebazaar.stock.dto.MarketImpactRequest;
import com.sharebazaar.stock.service.MarketSimulationService;
import com.sharebazaar.stock.service.ShareService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shares")
public class ShareController {

    private final ShareService shareService;
    private final MarketSimulationService marketSimulationService;

    public ShareController(ShareService shareService, MarketSimulationService marketSimulationService) {
        this.shareService = shareService;
        this.marketSimulationService = marketSimulationService;
    }

    @PostMapping("/{id}/impact")
    @ResponseStatus(HttpStatus.OK)
    public void applyMarketImpact(@PathVariable Long id, @RequestBody MarketImpactRequest request) {
        marketSimulationService.applyMarketImpact(id, request.getQuantity(), request.isBuy());
    }

    @PostMapping("/company/{companyId}/impact")
    @ResponseStatus(HttpStatus.OK)
    public void applyMarketImpactByCompany(@PathVariable Long companyId, @RequestBody MarketImpactRequest request) {
        // Find share by company ID
        Long shareId = shareService.getShareByCompanyId(companyId).getId();
        marketSimulationService.applyMarketImpact(shareId, request.getQuantity(), request.isBuy());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShareResponse createShare(@Valid @RequestBody ShareRequest request) {
        return shareService.createShare(request);
    }

    @GetMapping
    public List<ShareResponse> getAllShares() {
        return shareService.getAllShares();
    }

    @GetMapping("/{id}")
    public ShareResponse getShareById(@PathVariable Long id) {
        return shareService.getShareById(id);
    }

    @GetMapping("/{id}/history")
    public List<SharePriceHistory> getShareHistory(@PathVariable Long id) {
        return shareService.getSharePriceHistory(id);
    }

    @GetMapping("/company/{companyId}")
    public ShareResponse getShareByCompanyId(@PathVariable Long companyId) {
        return shareService.getShareByCompanyId(companyId);
    }

    @PutMapping("/{id}")
    public ShareResponse updateShare(@PathVariable Long id,
                                     @Valid @RequestBody ShareUpdateRequest request) {
        return shareService.updateShare(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShare(@PathVariable Long id) {
        shareService.deleteShare(id);
        return ResponseEntity.noContent().build();
    }
}
