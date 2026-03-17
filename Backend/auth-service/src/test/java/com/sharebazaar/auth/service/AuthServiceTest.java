package com.sharebazaar.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sharebazaar.auth.domain.User;
import com.sharebazaar.auth.dto.LoginRequest;
import com.sharebazaar.auth.dto.RegisterRequest;
import com.sharebazaar.auth.repository.UserRepository;
import com.sharebazaar.core.shared.dto.UserDto;
import com.sharebazaar.core.shared.exception.GlobalException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AuthService authService;

    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        authService = new AuthService(userRepository, passwordEncoder);
    }

    @Test
    void registerShouldSucceedWhenUserDoesNotExist() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("john_doe");
        request.setEmail("john@example.com");
        request.setPassword("Secret123!");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("john_doe")).thenReturn(false);
        when(userRepository.save(org.mockito.ArgumentMatchers.any(User.class)))
                .thenAnswer(invocation -> {
                    User user = invocation.getArgument(0);
                    user.setId(1L);
                    return user;
                });

        UserDto result = authService.register(request);

        assertEquals(1L, result.getId());
        assertEquals("john_doe", result.getUsername());
        assertEquals("john@example.com", result.getEmail());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        org.junit.jupiter.api.Assertions.assertNotEquals("Secret123!", savedUser.getPassword());
        org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.matches("Secret123!", savedUser.getPassword()));
    }

    @Test
    void loginShouldFailWhenUserIsNotFound() {
        LoginRequest request = new LoginRequest();
        request.setEmail("missing@example.com");
        request.setPassword("Secret123!");

        when(userRepository.findByEmail("missing@example.com")).thenReturn(java.util.Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class, () -> authService.login(request));
        assertEquals("Invalid credentials", exception.getMessage());
    }
}
