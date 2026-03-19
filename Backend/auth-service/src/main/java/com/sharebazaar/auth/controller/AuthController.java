package com.sharebazaar.auth.controller;

import com.sharebazaar.auth.dto.AuthResponse;
import com.sharebazaar.auth.dto.ChangePasswordRequest;
import com.sharebazaar.auth.dto.LoginRequest;
import com.sharebazaar.auth.dto.RegisterRequest;
import com.sharebazaar.auth.service.AuthService;
import com.sharebazaar.core.shared.dto.UserDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/users")
    public List<UserDto> getAllUsers() {
        return authService.getAllUsers();
    }

    /**
     * POST /auth/change-password
     * Body: { userId, currentPassword, newPassword }
     */
    @PostMapping("/change-password")
    public Map<String, String> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return Map.of("message", "Password changed successfully");
    }
}