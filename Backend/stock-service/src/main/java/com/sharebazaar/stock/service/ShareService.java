package com.sharebazaar.stock.service;

import com.sharebazaar.core.shared.exception.GlobalException;
import com.sharebazaar.stock.domain.Company;
import com.sharebazaar.stock.domain.Share;
import com.sharebazaar.stock.domain.SharePriceHistory;
import com.sharebazaar.stock.dto.ShareRequest;
import com.sharebazaar.stock.dto.ShareResponse;
import com.sharebazaar.stock.dto.ShareUpdateRequest;
import com.sharebazaar.stock.repository.CompanyRepository;
import com.sharebazaar.stock.repository.SharePriceHistoryRepository;
import com.sharebazaar.stock.repository.ShareRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ShareService {

    private static final Logger log = LoggerFactory.getLogger(ShareService.class);

    private final ShareRepository shareRepository;
    private final CompanyRepository companyRepository;
    private final SharePriceHistoryRepository sharePriceHistoryRepository;

    public ShareService(ShareRepository shareRepository, 
                        CompanyRepository companyRepository,
                        SharePriceHistoryRepository sharePriceHistoryRepository) {
        this.shareRepository = shareRepository;
        this.companyRepository = companyRepository;
        this.sharePriceHistoryRepository = sharePriceHistoryRepository;
    }

    @Transactional
    public ShareResponse createShare(ShareRequest request) {
        log.info("Creating share for company id={}", request.getCompanyId());

        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new GlobalException("Company not found"));

        if (shareRepository.existsByCompanyId(company.getId())) {
            throw new GlobalException("Shares already exist for this company");
        }

        if (request.getAvailableShares() > request.getTotalShares()) {
            throw new GlobalException("Available shares cannot exceed total shares");
        }

        Share share = new Share();
        share.setCompany(company);
        share.setTotalShares(request.getTotalShares());
        share.setAvailableShares(request.getAvailableShares());
        share.setPricePerShare(request.getPricePerShare());

        Share saved = shareRepository.save(share);
        
        // Record initial price history
        SharePriceHistory history = new SharePriceHistory(saved, saved.getPricePerShare(), LocalDateTime.now());
        sharePriceHistoryRepository.save(history);
        
        log.info("Share created: id={}, companyId={}", saved.getId(), company.getId());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ShareResponse> getAllShares() {
        return shareRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ShareResponse getShareById(Long id) {
        Share share = shareRepository.findById(id)
                .orElseThrow(() -> new GlobalException("Share not found"));
        return toResponse(share);
    }

    @Transactional(readOnly = true)
    public ShareResponse getShareByCompanyId(Long companyId) {
        Share share = shareRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new GlobalException("Share not found for this company"));
        return toResponse(share);
    }

    @Transactional
    public ShareResponse updateShare(Long id, ShareUpdateRequest request) {
        log.info("Updating share: id={}", id);

        Share share = shareRepository.findById(id)
                .orElseThrow(() -> new GlobalException("Share not found"));

        if (request.getTotalShares() != null) {
            share.setTotalShares(request.getTotalShares());
        }
        if (request.getAvailableShares() != null) {
            share.setAvailableShares(request.getAvailableShares());
        }
        if (request.getPricePerShare() != null) {
            if (share.getPricePerShare().compareTo(request.getPricePerShare()) != 0) {
                // Price changed, record history
                share.setPricePerShare(request.getPricePerShare());
                SharePriceHistory history = new SharePriceHistory(share, request.getPricePerShare(), LocalDateTime.now());
                sharePriceHistoryRepository.save(history);
            }
        }

        if (share.getAvailableShares() > share.getTotalShares()) {
            throw new GlobalException("Available shares cannot exceed total shares");
        }

        Share saved = shareRepository.save(share);
        log.info("Share updated: id={}", saved.getId());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SharePriceHistory> getSharePriceHistory(Long shareId) {
        return sharePriceHistoryRepository.findByShareIdOrderByTimestampDesc(shareId);
    }

    @Transactional
    public void deleteShare(Long id) {
        log.info("Deleting share: id={}", id);

        Share share = shareRepository.findById(id)
                .orElseThrow(() -> new GlobalException("Share not found"));

        shareRepository.delete(share);
        log.info("Share deleted: id={}", id);
    }

    private ShareResponse toResponse(Share share) {
        return new ShareResponse(
                share.getId(),
                share.getCompany().getId(),
                share.getCompany().getName(),
                share.getCompany().getSymbol(),
                share.getTotalShares(),
                share.getAvailableShares(),
                share.getPricePerShare(),
                share.getCreatedAt(),
                share.getUpdatedAt()
        );
    }
}
