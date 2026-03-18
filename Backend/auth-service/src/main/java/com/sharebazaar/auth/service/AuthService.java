package com.sharebazaar.auth.service;

import com.sharebazaar.auth.domain.Role;
import com.sharebazaar.auth.domain.User;
import com.sharebazaar.auth.dto.AuthResponse;
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

        /* ROLE LOGIC */
        if (request.getRole() == null) {
            user.setRole(Role.USER);
        } else {
            user.setRole(request.getRole());
        }

        User savedUser = userRepository.save(user);

        return new UserDto(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getRole().name()
        );
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findByRole(Role.USER)
                .stream()
                .map(user -> new UserDto(
                        user.getId(),
                        user.getUsername(),
                        user.getEmail(),
                        user.getRole().name()
                ))
                .toList();
    }

    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new GlobalException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new GlobalException("Invalid credentials");
        }

        /* Replace with real JWT later */
        String token = "mock-jwt-token-for-" + user.getUsername();

        UserDto userDto = new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name()
        );

        return new AuthResponse(token, userDto);
    }
}