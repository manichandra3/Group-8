package com.sharebazaar.auth.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sharebazaar.auth.dto.AuthResponse;
import com.sharebazaar.auth.dto.LoginRequest;
import com.sharebazaar.auth.dto.RegisterRequest;
import com.sharebazaar.auth.service.AuthService;
import com.sharebazaar.core.shared.dto.UserDto;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void registerShouldDelegateToService() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("john_doe");
        request.setEmail("john@example.com");
        request.setPassword("password");

        UserDto expected = new UserDto(1L, "john_doe", "john@example.com", "USER");
        when(authService.register(request)).thenReturn(expected);

        UserDto result = controller.register(request);

        assertEquals(expected, result);
        verify(authService).register(request);
    }

    @Test
    void loginShouldDelegateToService() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("password");

        AuthResponse expected = new AuthResponse("token", new UserDto(1L, "john_doe", "john@example.com", "USER"));
        when(authService.login(request)).thenReturn(expected);

        AuthResponse result = controller.login(request);

        assertEquals(expected, result);
        verify(authService).login(request);
    }

    @Test
    void getAllUsersShouldDelegateToService() {
        List<UserDto> expected = List.of(
                new UserDto(1L, "jane", "jane@example.com", "USER"),
                new UserDto(2L, "tom", "tom@example.com", "USER")
        );
        when(authService.getAllUsers()).thenReturn(expected);

        List<UserDto> result = controller.getAllUsers();

        assertEquals(expected, result);
        verify(authService).getAllUsers();
    }
}
