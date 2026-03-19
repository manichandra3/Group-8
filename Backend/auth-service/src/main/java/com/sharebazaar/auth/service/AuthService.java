package com.sharebazaar.auth.service;

import com.sharebazaar.auth.domain.Role;
import com.sharebazaar.auth.domain.User;
import com.sharebazaar.auth.dto.AuthResponse;
import com.sharebazaar.auth.dto.ChangePasswordRequest;
import com.sharebazaar.auth.dto.LoginRequest;
import com.sharebazaar.auth.dto.RegisterRequest;
import com.sharebazaar.auth.repository.UserRepository;
import com.sharebazaar.core.shared.dto.UserDto;
import com.sharebazaar.core.shared.exception.GlobalException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserDto register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new GlobalException("Email is already registered");
        if (userRepository.existsByUsername(request.getUsername()))
            throw new GlobalException("Username is already taken");

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole() == null ? Role.USER : request.getRole());

        User saved = userRepository.save(user);
        return toDto(saved);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new GlobalException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword()))
            throw new GlobalException("Invalid credentials");

        String token = "mock-jwt-token-for-" + user.getUsername();
        return new AuthResponse(token, toDto(user));
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findByRole(Role.USER)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Change password — verifies current password before updating.
     */
    public void changePassword(ChangePasswordRequest request) {
        if (request.getUserId() == null)
            throw new GlobalException("User ID is required");

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new GlobalException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword()))
            throw new GlobalException("Current password is incorrect");

        if (request.getCurrentPassword().equals(request.getNewPassword()))
            throw new GlobalException("New password must be different from current password");

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private UserDto toDto(User u) {
        return new UserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole().name());
    }
}