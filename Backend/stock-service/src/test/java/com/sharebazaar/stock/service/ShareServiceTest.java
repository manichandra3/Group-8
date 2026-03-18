package com.sharebazaar.stock.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

import com.sharebazaar.core.shared.exception.GlobalException;
import com.sharebazaar.stock.domain.Company;
import com.sharebazaar.stock.domain.Share;
import com.sharebazaar.stock.dto.ShareRequest;
import com.sharebazaar.stock.dto.ShareResponse;
import com.sharebazaar.stock.dto.ShareUpdateRequest;
import com.sharebazaar.stock.repository.CompanyRepository;
import com.sharebazaar.stock.repository.ShareRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class ShareServiceTest {

    @Mock
    private ShareRepository shareRepository;

    @Mock
    private CompanyRepository companyRepository;

    private ShareService shareService;

    @BeforeEach
    void setUp() {
        shareService = new ShareService(shareRepository, companyRepository);
    }

    // ---- Helper methods ----

    private Company createCompany(Long id, String name, String symbol) {
        Company company = new Company();
        company.setId(id);
        company.setName(name);
        company.setSymbol(symbol);
        company.setSector("Technology");
        company.setActive(true);
        return company;
    }

    private Share createShare(Long id, Company company, Long totalShares,
                              Long availableShares, BigDecimal pricePerShare) {
        Share share = new Share();
        share.setId(id);
        share.setCompany(company);
        share.setTotalShares(totalShares);
        share.setAvailableShares(availableShares);
        share.setPricePerShare(pricePerShare);
        return share;
    }

    private ShareRequest createShareRequest(Long companyId, Long totalShares,
                                            Long availableShares, BigDecimal pricePerShare) {
        ShareRequest request = new ShareRequest();
        request.setCompanyId(companyId);
        request.setTotalShares(totalShares);
        request.setAvailableShares(availableShares);
        request.setPricePerShare(pricePerShare);
        return request;
    }

    // ---- createShare Tests ----

    @Test
    void createShareShouldSucceed() {
        Company company = createCompany(1L, "Infosys", "INFY");
        ShareRequest request = createShareRequest(1L, 10000L, 8000L, new BigDecimal("150.50"));

        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
        when(shareRepository.existsByCompanyId(1L)).thenReturn(false);
        when(shareRepository.save(any(Share.class)))
                .thenAnswer(invocation -> {
                    Share share = invocation.getArgument(0);
                    share.setId(1L);
                    return share;
                });

        ShareResponse response = shareService.createShare(request);

        assertEquals(1L, response.getId());
        assertEquals(1L, response.getCompanyId());
        assertEquals("Infosys", response.getCompanyName());
        assertEquals("INFY", response.getCompanySymbol());
        assertEquals(10000L, response.getTotalShares());
        assertEquals(8000L, response.getAvailableShares());
        assertEquals(new BigDecimal("150.50"), response.getPricePerShare());

        ArgumentCaptor<Share> captor = ArgumentCaptor.forClass(Share.class);
        verify(shareRepository).save(captor.capture());
        assertEquals(company, captor.getValue().getCompany());
    }

    @Test
    void createShareShouldFailWhenCompanyNotFound() {
        ShareRequest request = createShareRequest(999L, 10000L, 8000L, new BigDecimal("100.00"));

        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> shareService.createShare(request));
        assertEquals("Company not found", exception.getMessage());

        verify(shareRepository, never()).save(any());
    }

    @Test
    void createShareShouldFailWhenSharesAlreadyExistForCompany() {
        Company company = createCompany(1L, "Infosys", "INFY");
        ShareRequest request = createShareRequest(1L, 10000L, 8000L, new BigDecimal("100.00"));

        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
        when(shareRepository.existsByCompanyId(1L)).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class,
                () -> shareService.createShare(request));
        assertEquals("Shares already exist for this company", exception.getMessage());

        verify(shareRepository, never()).save(any());
    }

    @Test
    void createShareShouldFailWhenAvailableExceedsTotal() {
        Company company = createCompany(1L, "Infosys", "INFY");
        ShareRequest request = createShareRequest(1L, 5000L, 10000L, new BigDecimal("100.00"));

        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
        when(shareRepository.existsByCompanyId(1L)).thenReturn(false);

        GlobalException exception = assertThrows(GlobalException.class,
                () -> shareService.createShare(request));
        assertEquals("Available shares cannot exceed total shares", exception.getMessage());

        verify(shareRepository, never()).save(any());
    }

    // ---- getAllShares Tests ----

    @Test
    void getAllSharesShouldReturnList() {
        Company company1 = createCompany(1L, "Infosys", "INFY");
        Company company2 = createCompany(2L, "TCS", "TCS");
        Share share1 = createShare(1L, company1, 10000L, 8000L, new BigDecimal("150.00"));
        Share share2 = createShare(2L, company2, 20000L, 15000L, new BigDecimal("350.00"));

        when(shareRepository.findAll()).thenReturn(List.of(share1, share2));

        List<ShareResponse> result = shareService.getAllShares();

        assertEquals(2, result.size());
        assertEquals("INFY", result.get(0).getCompanySymbol());
        assertEquals("TCS", result.get(1).getCompanySymbol());
        assertEquals(10000L, result.get(0).getTotalShares());
        assertEquals(20000L, result.get(1).getTotalShares());
    }

    @Test
    void getAllSharesShouldReturnEmptyListWhenNoneExist() {
        when(shareRepository.findAll()).thenReturn(List.of());

        List<ShareResponse> result = shareService.getAllShares();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ---- getShareById Tests ----

    @Test
    void getShareByIdShouldReturnShare() {
        Company company = createCompany(1L, "Infosys", "INFY");
        Share share = createShare(1L, company, 10000L, 8000L, new BigDecimal("150.00"));

        when(shareRepository.findById(1L)).thenReturn(Optional.of(share));

        ShareResponse response = shareService.getShareById(1L);

        assertEquals(1L, response.getId());
        assertEquals(1L, response.getCompanyId());
        assertEquals("Infosys", response.getCompanyName());
        assertEquals(10000L, response.getTotalShares());
        assertEquals(8000L, response.getAvailableShares());
        assertEquals(new BigDecimal("150.00"), response.getPricePerShare());
    }

    @Test
    void getShareByIdShouldFailWhenNotFound() {
        when(shareRepository.findById(999L)).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> shareService.getShareById(999L));
        assertEquals("Share not found", exception.getMessage());
    }

    // ---- getShareByCompanyId Tests ----

    @Test
    void getShareByCompanyIdShouldReturnShare() {
        Company company = createCompany(1L, "TCS", "TCS");
        Share share = createShare(1L, company, 20000L, 15000L, new BigDecimal("350.00"));

        when(shareRepository.findByCompanyId(1L)).thenReturn(Optional.of(share));

        ShareResponse response = shareService.getShareByCompanyId(1L);

        assertEquals(1L, response.getCompanyId());
        assertEquals("TCS", response.getCompanyName());
        assertEquals("TCS", response.getCompanySymbol());
        assertEquals(20000L, response.getTotalShares());
    }

    @Test
    void getShareByCompanyIdShouldFailWhenNotFound() {
        when(shareRepository.findByCompanyId(999L)).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> shareService.getShareByCompanyId(999L));
        assertEquals("Share not found for this company", exception.getMessage());
    }

    // ---- updateShare Tests ----

    @Test
    void updateShareShouldSucceedWithAllFields() {
        Company company = createCompany(1L, "Infosys", "INFY");
        Share existing = createShare(1L, company, 10000L, 8000L, new BigDecimal("150.00"));

        ShareUpdateRequest request = new ShareUpdateRequest();
        request.setTotalShares(20000L);
        request.setAvailableShares(15000L);
        request.setPricePerShare(new BigDecimal("200.00"));

        when(shareRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(shareRepository.save(any(Share.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ShareResponse response = shareService.updateShare(1L, request);

        assertEquals(20000L, response.getTotalShares());
        assertEquals(15000L, response.getAvailableShares());
        assertEquals(new BigDecimal("200.00"), response.getPricePerShare());
    }

    @Test
    void updateShareShouldSucceedWithPartialFields() {
        Company company = createCompany(1L, "Infosys", "INFY");
        Share existing = createShare(1L, company, 10000L, 8000L, new BigDecimal("150.00"));

        ShareUpdateRequest request = new ShareUpdateRequest();
        request.setPricePerShare(new BigDecimal("175.00"));
        // totalShares and availableShares are null — should remain unchanged

        when(shareRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(shareRepository.save(any(Share.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ShareResponse response = shareService.updateShare(1L, request);

        assertEquals(10000L, response.getTotalShares());
        assertEquals(8000L, response.getAvailableShares());
        assertEquals(new BigDecimal("175.00"), response.getPricePerShare());
    }

    @Test
    void updateShareShouldFailWhenNotFound() {
        ShareUpdateRequest request = new ShareUpdateRequest();
        request.setTotalShares(20000L);

        when(shareRepository.findById(999L)).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> shareService.updateShare(999L, request));
        assertEquals("Share not found", exception.getMessage());

        verify(shareRepository, never()).save(any());
    }

    @Test
    void updateShareShouldFailWhenAvailableExceedsTotal() {
        Company company = createCompany(1L, "Infosys", "INFY");
        Share existing = createShare(1L, company, 10000L, 8000L, new BigDecimal("150.00"));

        ShareUpdateRequest request = new ShareUpdateRequest();
        request.setTotalShares(5000L);
        // available stays at 8000 which > 5000

        when(shareRepository.findById(1L)).thenReturn(Optional.of(existing));

        GlobalException exception = assertThrows(GlobalException.class,
                () -> shareService.updateShare(1L, request));
        assertEquals("Available shares cannot exceed total shares", exception.getMessage());

        verify(shareRepository, never()).save(any());
    }

    @Test
    void updateShareShouldFailWhenUpdatedAvailableExceedsExistingTotal() {
        Company company = createCompany(1L, "Infosys", "INFY");
        Share existing = createShare(1L, company, 10000L, 8000L, new BigDecimal("150.00"));

        ShareUpdateRequest request = new ShareUpdateRequest();
        request.setAvailableShares(15000L);
        // total stays at 10000, available becomes 15000 > 10000

        when(shareRepository.findById(1L)).thenReturn(Optional.of(existing));

        GlobalException exception = assertThrows(GlobalException.class,
                () -> shareService.updateShare(1L, request));
        assertEquals("Available shares cannot exceed total shares", exception.getMessage());

        verify(shareRepository, never()).save(any());
    }

    // ---- deleteShare Tests ----

    @Test
    void deleteShareShouldSucceed() {
        Company company = createCompany(1L, "Infosys", "INFY");
        Share share = createShare(1L, company, 10000L, 8000L, new BigDecimal("150.00"));

        when(shareRepository.findById(1L)).thenReturn(Optional.of(share));

        shareService.deleteShare(1L);

        verify(shareRepository).delete(share);
    }

    @Test
    void deleteShareShouldFailWhenNotFound() {
        when(shareRepository.findById(999L)).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> shareService.deleteShare(999L));
        assertEquals("Share not found", exception.getMessage());

        verify(shareRepository, never()).delete(any());
    }
}
