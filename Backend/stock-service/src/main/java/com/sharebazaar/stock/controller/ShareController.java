package com.sharebazaar.stock.controller;

import com.sharebazaar.stock.dto.ShareRequest;
import com.sharebazaar.stock.dto.ShareResponse;
import com.sharebazaar.stock.dto.ShareUpdateRequest;
import com.sharebazaar.stock.service.ShareService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/shares")
public class ShareController {

    private final ShareService shareService;

    public ShareController(ShareService shareService) {
        this.shareService = shareService;
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
