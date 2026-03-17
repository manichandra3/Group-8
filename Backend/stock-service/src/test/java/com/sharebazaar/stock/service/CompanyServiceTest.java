package com.sharebazaar.stock.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

import com.sharebazaar.core.shared.exception.GlobalException;
import com.sharebazaar.stock.domain.Company;
import com.sharebazaar.stock.dto.CompanyRequest;
import com.sharebazaar.stock.dto.CompanyResponse;
import com.sharebazaar.stock.repository.CompanyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class CompanyServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    private CompanyService companyService;

    @BeforeEach
    void setUp() {
        companyService = new CompanyService(companyRepository);
    }

    // ---- Helper methods ----

    private Company createCompany(Long id, String name, String symbol) {
        Company company = new Company();
        company.setId(id);
        company.setName(name);
        company.setSymbol(symbol);
        company.setSector("Technology");
        company.setDescription("A tech company");
        company.setLogoUrl("https://example.com/logo.png");
        company.setActive(true);
        return company;
    }

    private CompanyRequest createCompanyRequest(String name, String symbol) {
        CompanyRequest request = new CompanyRequest();
        request.setName(name);
        request.setSymbol(symbol);
        request.setSector("Technology");
        request.setDescription("A tech company");
        request.setLogoUrl("https://example.com/logo.png");
        return request;
    }

    // ---- createCompany Tests ----

    @Test
    void createCompanyShouldSucceed() {
        CompanyRequest request = createCompanyRequest("Infosys", "infy");

        when(companyRepository.existsByName("Infosys")).thenReturn(false);
        when(companyRepository.existsBySymbol("INFY")).thenReturn(false);
        when(companyRepository.save(any(Company.class)))
                .thenAnswer(invocation -> {
                    Company company = invocation.getArgument(0);
                    company.setId(1L);
                    return company;
                });

        CompanyResponse response = companyService.createCompany(request);

        assertEquals(1L, response.getId());
        assertEquals("Infosys", response.getName());
        assertEquals("INFY", response.getSymbol());
        assertEquals("Technology", response.getSector());
        assertEquals("A tech company", response.getDescription());
        assertEquals("https://example.com/logo.png", response.getLogoUrl());
        assertTrue(response.isActive());

        ArgumentCaptor<Company> captor = ArgumentCaptor.forClass(Company.class);
        verify(companyRepository).save(captor.capture());
        assertEquals("INFY", captor.getValue().getSymbol());
    }

    @Test
    void createCompanyShouldConvertSymbolToUppercase() {
        CompanyRequest request = createCompanyRequest("Test Corp", "tcs");

        when(companyRepository.existsByName("Test Corp")).thenReturn(false);
        when(companyRepository.existsBySymbol("TCS")).thenReturn(false);
        when(companyRepository.save(any(Company.class)))
                .thenAnswer(invocation -> {
                    Company company = invocation.getArgument(0);
                    company.setId(1L);
                    return company;
                });

        CompanyResponse response = companyService.createCompany(request);

        assertEquals("TCS", response.getSymbol());
    }

    @Test
    void createCompanyShouldFailWhenNameAlreadyExists() {
        CompanyRequest request = createCompanyRequest("Infosys", "INFY");

        when(companyRepository.existsByName("Infosys")).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class,
                () -> companyService.createCompany(request));
        assertEquals("Company name already exists", exception.getMessage());

        verify(companyRepository, never()).save(any());
    }

    @Test
    void createCompanyShouldFailWhenSymbolAlreadyExists() {
        CompanyRequest request = createCompanyRequest("Infosys Ltd", "INFY");

        when(companyRepository.existsByName("Infosys Ltd")).thenReturn(false);
        when(companyRepository.existsBySymbol("INFY")).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class,
                () -> companyService.createCompany(request));
        assertEquals("Company symbol already exists", exception.getMessage());

        verify(companyRepository, never()).save(any());
    }

    // ---- getAllCompanies Tests ----

    @Test
    void getAllCompaniesShouldReturnList() {
        Company company1 = createCompany(1L, "Infosys", "INFY");
        Company company2 = createCompany(2L, "TCS", "TCS");

        when(companyRepository.findAll()).thenReturn(List.of(company1, company2));

        List<CompanyResponse> result = companyService.getAllCompanies();

        assertEquals(2, result.size());
        assertEquals("Infosys", result.get(0).getName());
        assertEquals("TCS", result.get(1).getName());
    }

    @Test
    void getAllCompaniesShouldReturnEmptyListWhenNoneExist() {
        when(companyRepository.findAll()).thenReturn(List.of());

        List<CompanyResponse> result = companyService.getAllCompanies();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ---- getCompanyById Tests ----

    @Test
    void getCompanyByIdShouldReturnCompany() {
        Company company = createCompany(1L, "Infosys", "INFY");

        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));

        CompanyResponse response = companyService.getCompanyById(1L);

        assertEquals(1L, response.getId());
        assertEquals("Infosys", response.getName());
        assertEquals("INFY", response.getSymbol());
    }

    @Test
    void getCompanyByIdShouldFailWhenNotFound() {
        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> companyService.getCompanyById(999L));
        assertEquals("Company not found", exception.getMessage());
    }

    // ---- getCompanyBySymbol Tests ----

    @Test
    void getCompanyBySymbolShouldReturnCompany() {
        Company company = createCompany(1L, "Infosys", "INFY");

        when(companyRepository.findBySymbol("INFY")).thenReturn(Optional.of(company));

        CompanyResponse response = companyService.getCompanyBySymbol("infy");

        assertEquals(1L, response.getId());
        assertEquals("Infosys", response.getName());
        assertEquals("INFY", response.getSymbol());
    }

    @Test
    void getCompanyBySymbolShouldConvertToUpperCase() {
        Company company = createCompany(1L, "TCS", "TCS");

        when(companyRepository.findBySymbol("TCS")).thenReturn(Optional.of(company));

        CompanyResponse response = companyService.getCompanyBySymbol("tcs");

        assertEquals("TCS", response.getSymbol());
        verify(companyRepository).findBySymbol("TCS");
    }

    @Test
    void getCompanyBySymbolShouldFailWhenNotFound() {
        when(companyRepository.findBySymbol("NOPE")).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> companyService.getCompanyBySymbol("NOPE"));
        assertEquals("Company not found", exception.getMessage());
    }

    // ---- updateCompany Tests ----

    @Test
    void updateCompanyShouldSucceedWithAllFields() {
        Company existing = createCompany(1L, "Old Name", "OLD");

        CompanyRequest request = new CompanyRequest();
        request.setName("New Name");
        request.setSymbol("new");
        request.setSector("Finance");
        request.setDescription("Updated description");
        request.setLogoUrl("https://example.com/new-logo.png");

        when(companyRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(companyRepository.existsByName("New Name")).thenReturn(false);
        when(companyRepository.existsBySymbol("NEW")).thenReturn(false);
        when(companyRepository.save(any(Company.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CompanyResponse response = companyService.updateCompany(1L, request);

        assertEquals("New Name", response.getName());
        assertEquals("NEW", response.getSymbol());
        assertEquals("Finance", response.getSector());
        assertEquals("Updated description", response.getDescription());
        assertEquals("https://example.com/new-logo.png", response.getLogoUrl());
    }

    @Test
    void updateCompanyShouldAllowKeepingSameName() {
        Company existing = createCompany(1L, "Infosys", "INFY");

        CompanyRequest request = new CompanyRequest();
        request.setName("Infosys");
        request.setSymbol("INFY");

        when(companyRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(companyRepository.save(any(Company.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CompanyResponse response = companyService.updateCompany(1L, request);

        assertEquals("Infosys", response.getName());
        assertEquals("INFY", response.getSymbol());
    }

    @Test
    void updateCompanyShouldFailWhenCompanyNotFound() {
        CompanyRequest request = createCompanyRequest("Doesn't Matter", "NM");

        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> companyService.updateCompany(999L, request));
        assertEquals("Company not found", exception.getMessage());
    }

    @Test
    void updateCompanyShouldFailWhenNewNameAlreadyExists() {
        Company existing = createCompany(1L, "Old Name", "OLD");

        CompanyRequest request = new CompanyRequest();
        request.setName("Taken Name");

        when(companyRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(companyRepository.existsByName("Taken Name")).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class,
                () -> companyService.updateCompany(1L, request));
        assertEquals("Company name already exists", exception.getMessage());
    }

    @Test
    void updateCompanyShouldFailWhenNewSymbolAlreadyExists() {
        Company existing = createCompany(1L, "Infosys", "INFY");

        CompanyRequest request = new CompanyRequest();
        request.setSymbol("TCS");

        when(companyRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(companyRepository.existsBySymbol("TCS")).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class,
                () -> companyService.updateCompany(1L, request));
        assertEquals("Company symbol already exists", exception.getMessage());
    }

    @Test
    void updateCompanyShouldSkipNullFields() {
        Company existing = createCompany(1L, "Infosys", "INFY");

        CompanyRequest request = new CompanyRequest();
        // All fields are null — nothing should change except save

        when(companyRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(companyRepository.save(any(Company.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CompanyResponse response = companyService.updateCompany(1L, request);

        assertEquals("Infosys", response.getName());
        assertEquals("INFY", response.getSymbol());
        assertEquals("Technology", response.getSector());
    }

    // ---- deleteCompany Tests ----

    @Test
    void deleteCompanyShouldSucceed() {
        Company company = createCompany(1L, "Infosys", "INFY");

        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));

        companyService.deleteCompany(1L);

        verify(companyRepository).delete(company);
    }

    @Test
    void deleteCompanyShouldFailWhenNotFound() {
        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> companyService.deleteCompany(999L));
        assertEquals("Company not found", exception.getMessage());

        verify(companyRepository, never()).delete(any());
    }

    // ---- toggleActive Tests ----

    @Test
    void toggleActiveShouldSetToInactive() {
        Company company = createCompany(1L, "Infosys", "INFY");
        company.setActive(true);

        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
        when(companyRepository.save(any(Company.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CompanyResponse response = companyService.toggleActive(1L, false);

        assertFalse(response.isActive());
    }

    @Test
    void toggleActiveShouldSetToActive() {
        Company company = createCompany(1L, "Infosys", "INFY");
        company.setActive(false);

        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
        when(companyRepository.save(any(Company.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CompanyResponse response = companyService.toggleActive(1L, true);

        assertTrue(response.isActive());
    }

    @Test
    void toggleActiveShouldFailWhenNotFound() {
        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> companyService.toggleActive(999L, true));
        assertEquals("Company not found", exception.getMessage());
    }
}
