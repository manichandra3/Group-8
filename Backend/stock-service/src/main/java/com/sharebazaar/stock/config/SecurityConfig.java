package com.sharebazaar.stock.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // ── Swagger ──────────────────────────────────────────────────
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        // ── WebSocket handshake + SockJS polling fallback ─────────────
                        // SockJS uses these paths when native WS isn't available:
                        //   /ws/info               → checks transport support
                        //   /ws/{server}/{session}/websocket  → raw WS upgrade
                        //   /ws/{server}/{session}/xhr*       → XHR polling fallback
                        .requestMatchers(
                                "/ws/**",
                                "/ws/info/**"
                        ).permitAll()

                        // ── Price snapshot REST endpoint (called on page load) ─────────
                        .requestMatchers("/api/prices/**").permitAll()

                        // ── Everything else open (your existing behaviour) ─────────────
                        .anyRequest().permitAll()
                );

        // JWT filter is commented out on purpose (matching your existing config).
        // Uncomment when you are ready to lock down routes:
        // .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // ── Origins ──────────────────────────────────────────────────────────
        // Include both Vite dev server and CRA dev server.
        // SockJS XHR fallback also sends an Origin header, so these must match.
        configuration.setAllowedOrigins(List.of(
                "http://localhost:3000",   // CRA
                "http://localhost:5173"    // Vite
        ));

        // ── Methods ───────────────────────────────────────────────────────────
        // POST is required for SockJS XHR-send fallback.
        configuration.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));

        // ── Headers ───────────────────────────────────────────────────────────
        // "Upgrade" and "Connection" are used by the WebSocket upgrade request.
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Upgrade",
                "Connection",
                "Sec-WebSocket-Key",
                "Sec-WebSocket-Version",
                "Sec-WebSocket-Extensions",
                "X-Requested-With"
        ));

        // ── Credentials ───────────────────────────────────────────────────────
        // Required for SockJS — it sends cookies on XHR fallback requests.
        configuration.setAllowCredentials(true);

        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        // Apply to all paths including /ws/**
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}