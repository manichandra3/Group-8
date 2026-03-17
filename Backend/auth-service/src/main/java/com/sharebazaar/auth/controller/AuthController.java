package com.sharebazaar.auth.controller;

import com.sharebazaar.auth.dto.AuthResponse;
import com.sharebazaar.auth.dto.LoginRequest;
import com.sharebazaar.auth.dto.RegisterRequest;
import com.sharebazaar.auth.dto.UpdateProfileRequest;
import com.sharebazaar.auth.service.AuthService;
import com.sharebazaar.core.shared.dto.UserDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
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

    @GetMapping("/me")
    public UserDto getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        return authService.getCurrentUser(email);
    }

    @PutMapping("/profile")
    public UserDto updateProfile(Authentication authentication,
                                 @Valid @RequestBody UpdateProfileRequest request) {
        String email = authentication.getName();
        return authService.updateProfile(email, request);
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(Authentication authentication) {
        String email = authentication.getName();
        authService.deleteAccount(email);
        return ResponseEntity.noContent().build();
    }
}
