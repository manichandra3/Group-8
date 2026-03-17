package com.sharebazaar.auth.service;

import com.sharebazaar.auth.domain.User;
import com.sharebazaar.auth.dto.AuthResponse;
import com.sharebazaar.auth.dto.LoginRequest;
import com.sharebazaar.auth.dto.RegisterRequest;
import com.sharebazaar.auth.repository.UserRepository;
import com.sharebazaar.core.shared.dto.UserDto;
import com.sharebazaar.core.shared.exception.GlobalException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserDto register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new GlobalException("Email is already registered");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new GlobalException("Username is already taken");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        User savedUser = userRepository.save(user);
        return new UserDto(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new GlobalException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new GlobalException("Invalid credentials");
        }

        String token = "mock-jwt-token-for-" + user.getUsername();
        UserDto userDto = new UserDto(user.getId(), user.getUsername(), user.getEmail());
        return new AuthResponse(token, userDto);
    }
}
