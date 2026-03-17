package com.sharebazaar.stock.service;

import com.sharebazaar.core.shared.exception.GlobalException;
import com.sharebazaar.stock.domain.Company;
import com.sharebazaar.stock.dto.CompanyRequest;
import com.sharebazaar.stock.dto.CompanyResponse;
import com.sharebazaar.stock.repository.CompanyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CompanyService {

    private static final Logger log = LoggerFactory.getLogger(CompanyService.class);

    private final CompanyRepository companyRepository;

    public CompanyService(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    @Transactional
    public CompanyResponse createCompany(CompanyRequest request) {
        log.info("Creating company: {}", request.getSymbol());

        if (companyRepository.existsByName(request.getName())) {
            throw new GlobalException("Company name already exists");
        }
        if (companyRepository.existsBySymbol(request.getSymbol().toUpperCase())) {
            throw new GlobalException("Company symbol already exists");
        }

        Company company = new Company();
        company.setName(request.getName());
        company.setSymbol(request.getSymbol().toUpperCase());
        company.setSector(request.getSector());
        company.setDescription(request.getDescription());
        company.setLogoUrl(request.getLogoUrl());

        Company saved = companyRepository.save(company);
        log.info("Company created: id={}, symbol={}", saved.getId(), saved.getSymbol());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CompanyResponse> getAllCompanies() {
        return companyRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CompanyResponse getCompanyById(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new GlobalException("Company not found"));
        return toResponse(company);
    }

    @Transactional(readOnly = true)
    public CompanyResponse getCompanyBySymbol(String symbol) {
        Company company = companyRepository.findBySymbol(symbol.toUpperCase())
                .orElseThrow(() -> new GlobalException("Company not found"));
        return toResponse(company);
    }

    @Transactional
    public CompanyResponse updateCompany(Long id, CompanyRequest request) {
        log.info("Updating company: id={}", id);

        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new GlobalException("Company not found"));

        if (request.getName() != null && !request.getName().isBlank()) {
            if (!request.getName().equals(company.getName())
                    && companyRepository.existsByName(request.getName())) {
                throw new GlobalException("Company name already exists");
            }
            company.setName(request.getName());
        }

        if (request.getSymbol() != null && !request.getSymbol().isBlank()) {
            String newSymbol = request.getSymbol().toUpperCase();
            if (!newSymbol.equals(company.getSymbol())
                    && companyRepository.existsBySymbol(newSymbol)) {
                throw new GlobalException("Company symbol already exists");
            }
            company.setSymbol(newSymbol);
        }

        if (request.getSector() != null) {
            company.setSector(request.getSector());
        }
        if (request.getDescription() != null) {
            company.setDescription(request.getDescription());
        }
        if (request.getLogoUrl() != null) {
            company.setLogoUrl(request.getLogoUrl());
        }

        Company saved = companyRepository.save(company);
        log.info("Company updated: id={}", saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public void deleteCompany(Long id) {
        log.info("Deleting company: id={}", id);

        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new GlobalException("Company not found"));

        companyRepository.delete(company);
        log.info("Company deleted: id={}", id);
    }

    @Transactional
    public CompanyResponse toggleActive(Long id, boolean active) {
        log.info("Setting company id={} active={}", id, active);

        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new GlobalException("Company not found"));

        company.setActive(active);
        Company saved = companyRepository.save(company);
        return toResponse(saved);
    }

    private CompanyResponse toResponse(Company company) {
        return new CompanyResponse(
                company.getId(),
                company.getName(),
                company.getSymbol(),
                company.getSector(),
                company.getDescription(),
                company.getLogoUrl(),
                company.isActive(),
                company.getCreatedAt(),
                company.getUpdatedAt()
        );
    }
}
