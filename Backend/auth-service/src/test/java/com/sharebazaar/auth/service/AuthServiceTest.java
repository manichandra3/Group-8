package com.sharebazaar.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sharebazaar.auth.domain.Role;
import com.sharebazaar.auth.domain.User;
import com.sharebazaar.auth.dto.AuthResponse;
import com.sharebazaar.auth.dto.LoginRequest;
import com.sharebazaar.auth.dto.RegisterRequest;
import com.sharebazaar.auth.repository.UserRepository;
import com.sharebazaar.core.shared.dto.UserDto;
import com.sharebazaar.core.shared.exception.GlobalException;
import java.util.List;
import java.util.Optional;
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
        assertEquals("USER", result.getRole());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertNotEquals("Secret123!", savedUser.getPassword());
        assertTrue(passwordEncoder.matches("Secret123!", savedUser.getPassword()));
    }

    @Test
    void registerShouldFailWhenEmailAlreadyTaken() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("john_doe");
        request.setEmail("john@example.com");
        request.setPassword("Secret123!");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class, () -> authService.register(request));
        assertEquals("Email is already registered", exception.getMessage());
    }

    @Test
    void registerShouldFailWhenUsernameAlreadyTaken() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("john_doe");
        request.setEmail("john@example.com");
        request.setPassword("Secret123!");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("john_doe")).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class, () -> authService.register(request));
        assertEquals("Username is already taken", exception.getMessage());
    }

    @Test
    void registerShouldApplyRoleFromRequestWhenProvided() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("admin");
        request.setEmail("admin@example.com");
        request.setPassword("Secret123!");
        request.setRole(Role.ADMIN);

        when(userRepository.existsByEmail("admin@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("admin")).thenReturn(false);
        when(userRepository.save(org.mockito.ArgumentMatchers.any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserDto result = authService.register(request);

        assertEquals("ADMIN", result.getRole());
    }

    @Test
    void getAllUsersShouldReturnMappedUserDtos() {
        User user1 = new User(1L, "jane", "jane@example.com", "pass", Role.USER);
        User user2 = new User(2L, "tom", "tom@example.com", "pass", Role.USER);

        when(userRepository.findByRole(Role.USER)).thenReturn(List.of(user1, user2));

        List<UserDto> result = authService.getAllUsers();

        assertEquals(2, result.size());
        assertEquals("jane", result.get(0).getUsername());
        assertEquals("tom", result.get(1).getUsername());
    }

    @Test
    void loginShouldSucceedWhenCredentialsMatch() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("Secret123!");

        User user = new User(1L, "john_doe", "john@example.com", passwordEncoder.encode("Secret123!"), Role.USER);
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

        AuthResponse response = authService.login(request);

        assertEquals("john_doe", response.user().getUsername());
        assertEquals("john@example.com", response.user().getEmail());
        assertEquals("mock-jwt-token-for-john_doe", response.token());
    }

    @Test
    void loginShouldFailWhenPasswordDoesNotMatch() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("WrongPassword!");

        User user = new User(1L, "john_doe", "john@example.com", passwordEncoder.encode("Secret123!"), Role.USER);
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

        GlobalException exception = assertThrows(GlobalException.class, () -> authService.login(request));
        assertEquals("Invalid credentials", exception.getMessage());
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