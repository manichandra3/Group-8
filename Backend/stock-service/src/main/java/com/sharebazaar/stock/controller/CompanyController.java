package com.sharebazaar.stock.controller;

import com.sharebazaar.stock.dto.CompanyRequest;
import com.sharebazaar.stock.dto.CompanyResponse;
import com.sharebazaar.stock.service.CompanyService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    private final CompanyService companyService;

    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompanyResponse createCompany(@Valid @RequestBody CompanyRequest request) {
        return companyService.createCompany(request);
    }

    @GetMapping
    public List<CompanyResponse> getAllCompanies() {
        return companyService.getAllCompanies();
    }

    @GetMapping("/{id}")
    public CompanyResponse getCompanyById(@PathVariable Long id) {
        return companyService.getCompanyById(id);
    }

    @GetMapping("/symbol/{symbol}")
    public CompanyResponse getCompanyBySymbol(@PathVariable String symbol) {
        return companyService.getCompanyBySymbol(symbol);
    }

    @PutMapping("/{id}")
    public CompanyResponse updateCompany(@PathVariable Long id,
                                         @Valid @RequestBody CompanyRequest request) {
        return companyService.updateCompany(id, request);
    }

    @PatchMapping("/{id}/status")
    public CompanyResponse toggleActive(@PathVariable Long id,
                                        @RequestParam boolean active) {
        return companyService.toggleActive(id, active);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompany(@PathVariable Long id) {
        companyService.deleteCompany(id);
        return ResponseEntity.noContent().build();
    }
}
