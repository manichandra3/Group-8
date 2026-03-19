package com.sharebazaar.auth.service;

import java.util.List;
import java.util.stream.Collectors;
import com.sharebazaar.auth.domain.Role;
import com.sharebazaar.auth.domain.User;
import com.sharebazaar.auth.dto.AuthResponse;
import com.sharebazaar.auth.dto.LoginRequest;
import com.sharebazaar.auth.dto.RegisterRequest;
import com.sharebazaar.auth.dto.UpdateProfileRequest;
import com.sharebazaar.auth.repository.UserRepository;
import com.sharebazaar.core.shared.dto.UserDto;
import com.sharebazaar.core.shared.exception.GlobalException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        log.info("Registering user with email: {}", request.getEmail());

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

        if (request.getRole() == null) {
            user.setRole(Role.USER);
        } else {
            user.setRole(request.getRole());
        }

        User savedUser = userRepository.save(user);
        log.info("User registered successfully: id={}", savedUser.getId());
        return toUserDto(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new GlobalException("Invalid credentials"));

        if (!user.isEnabled()) {
            throw new GlobalException("Account is disabled");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Failed login attempt for email: {}", request.getEmail());
            throw new GlobalException("Invalid credentials");
        }

        String token = jwtService.generateToken(user.getEmail(), user.getUsername(), user.getId(), user.getRole().name());
        long expiresIn = jwtService.getExpirationMs();
        UserDto userDto = toUserDto(user);

        log.info("User logged in successfully: id={}", user.getId());
        return new AuthResponse(token, expiresIn, userDto);
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new GlobalException("User not found"));
        return toUserDto(user);
    }

    @Transactional
    public UserDto updateProfile(String email, UpdateProfileRequest request) {
        log.info("Updating profile for user: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new GlobalException("User not found"));

        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            if (!request.getUsername().equals(user.getUsername())
                    && userRepository.existsByUsername(request.getUsername())) {
                throw new GlobalException("Username is already taken");
            }
            user.setUsername(request.getUsername());
        }

        User savedUser = userRepository.save(user);
        log.info("Profile updated for user: id={}", savedUser.getId());
        return toUserDto(savedUser);
    }

    @Transactional
    public void deleteAccount(String email) {
        log.info("Deleting account for user: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new GlobalException("User not found"));

        userRepository.delete(user);
        log.info("Account deleted: id={}", user.getId());
    }

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new GlobalException("User not found"));
        return toUserDto(user);
    }

    @Transactional
    public UserDto updateUser(Long id, UserDto userDto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new GlobalException("User not found"));

        if (userDto.getUsername() != null && !userDto.getUsername().isBlank()) {
             if (!user.getUsername().equals(userDto.getUsername()) && userRepository.existsByUsername(userDto.getUsername())) {
                  throw new GlobalException("Username is already taken");
             }
             user.setUsername(userDto.getUsername());
        }

        if (userDto.getEmail() != null && !userDto.getEmail().isBlank()) {
             if (!user.getEmail().equals(userDto.getEmail()) && userRepository.existsByEmail(userDto.getEmail())) {
                  throw new GlobalException("Email is already registered");
             }
             user.setEmail(userDto.getEmail());
        }

        if (userDto.getRole() != null) {
            try {
                user.setRole(Role.valueOf(userDto.getRole()));
            } catch (IllegalArgumentException e) {
                throw new GlobalException("Invalid role: " + userDto.getRole());
            }
        }
        
        user.setEnabled(userDto.isEnabled());

        return toUserDto(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new GlobalException("User not found");
        }
        userRepository.deleteById(id);
    }

    private UserDto toUserDto(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name(), user.isEnabled());
    }
}
