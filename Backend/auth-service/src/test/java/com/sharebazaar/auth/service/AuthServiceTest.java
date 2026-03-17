package com.sharebazaar.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sharebazaar.auth.domain.User;
import com.sharebazaar.auth.dto.AuthResponse;
import com.sharebazaar.auth.dto.LoginRequest;
import com.sharebazaar.auth.dto.RegisterRequest;
import com.sharebazaar.auth.dto.UpdateProfileRequest;
import com.sharebazaar.auth.repository.UserRepository;
import com.sharebazaar.core.shared.dto.UserDto;
import com.sharebazaar.core.shared.exception.GlobalException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    private AuthService authService;
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    // ---- Register Tests ----

    @Test
    void registerShouldSucceedWhenUserDoesNotExist() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("john_doe");
        request.setEmail("john@example.com");
        request.setPassword("Secret123!");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("john_doe")).thenReturn(false);
        when(userRepository.save(any(User.class)))
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
        org.junit.jupiter.api.Assertions.assertNotEquals("Secret123!", savedUser.getPassword());
        assertTrue(passwordEncoder.matches("Secret123!", savedUser.getPassword()));
    }

    @Test
    void registerShouldFailWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("john_doe");
        request.setEmail("john@example.com");
        request.setPassword("Secret123!");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class, () -> authService.register(request));
        assertEquals("Email is already registered", exception.getMessage());
    }

    @Test
    void registerShouldFailWhenUsernameAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("john_doe");
        request.setEmail("john@example.com");
        request.setPassword("Secret123!");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("john_doe")).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class, () -> authService.register(request));
        assertEquals("Username is already taken", exception.getMessage());
    }

    // ---- Login Tests ----

    @Test
    void loginShouldSucceedWithValidCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("Secret123!");

        User user = new User(1L, "john_doe", "john@example.com",
                passwordEncoder.encode("Secret123!"));

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(anyString(), anyString(), anyLong())).thenReturn("test-jwt-token");
        when(jwtService.getExpirationMs()).thenReturn(3600000L);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("test-jwt-token", response.token());
        assertEquals("Bearer", response.tokenType());
        assertEquals(3600000L, response.expiresIn());
        assertEquals("john_doe", response.user().getUsername());
        assertEquals("john@example.com", response.user().getEmail());
        assertEquals("USER", response.user().getRole());
    }

    @Test
    void loginShouldFailWhenUserIsNotFound() {
        LoginRequest request = new LoginRequest();
        request.setEmail("missing@example.com");
        request.setPassword("Secret123!");

        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class, () -> authService.login(request));
        assertEquals("Invalid credentials", exception.getMessage());
    }

    @Test
    void loginShouldFailWhenPasswordIsWrong() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("WrongPassword!");

        User user = new User(1L, "john_doe", "john@example.com",
                passwordEncoder.encode("Secret123!"));

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

        GlobalException exception = assertThrows(GlobalException.class, () -> authService.login(request));
        assertEquals("Invalid credentials", exception.getMessage());
    }

    @Test
    void loginShouldFailWhenAccountIsDisabled() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("Secret123!");

        User user = new User(1L, "john_doe", "john@example.com",
                passwordEncoder.encode("Secret123!"));
        user.setEnabled(false);

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

        GlobalException exception = assertThrows(GlobalException.class, () -> authService.login(request));
        assertEquals("Account is disabled", exception.getMessage());
    }

    // ---- getCurrentUser Tests ----

    @Test
    void getCurrentUserShouldReturnUserDto() {
        User user = new User(1L, "john_doe", "john@example.com", "hashed");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

        UserDto result = authService.getCurrentUser("john@example.com");

        assertEquals(1L, result.getId());
        assertEquals("john_doe", result.getUsername());
        assertEquals("john@example.com", result.getEmail());
        assertEquals("USER", result.getRole());
    }

    @Test
    void getCurrentUserShouldFailWhenNotFound() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> authService.getCurrentUser("missing@example.com"));
        assertEquals("User not found", exception.getMessage());
    }

    // ---- updateProfile Tests ----

    @Test
    void updateProfileShouldSucceed() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setUsername("new_username");

        User user = new User(1L, "john_doe", "john@example.com", "hashed");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(userRepository.existsByUsername("new_username")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDto result = authService.updateProfile("john@example.com", request);

        assertEquals("new_username", result.getUsername());
        assertEquals("USER", result.getRole());
    }

    @Test
    void updateProfileShouldFailWhenUsernameIsTaken() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setUsername("taken_username");

        User user = new User(1L, "john_doe", "john@example.com", "hashed");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(userRepository.existsByUsername("taken_username")).thenReturn(true);

        GlobalException exception = assertThrows(GlobalException.class,
                () -> authService.updateProfile("john@example.com", request));
        assertEquals("Username is already taken", exception.getMessage());
    }

    // ---- deleteAccount Tests ----

    @Test
    void deleteAccountShouldSucceed() {
        User user = new User(1L, "john_doe", "john@example.com", "hashed");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

        authService.deleteAccount("john@example.com");

        verify(userRepository).delete(user);
    }

    @Test
    void deleteAccountShouldFailWhenNotFound() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        GlobalException exception = assertThrows(GlobalException.class,
                () -> authService.deleteAccount("missing@example.com"));
        assertEquals("User not found", exception.getMessage());
    }
}
