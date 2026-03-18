package com.sharebazaar.stock.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

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
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // Anyone authenticated can view companies and shares
                        .requestMatchers(HttpMethod.GET, "/api/companies/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/shares/**").authenticated()
                        // Only ADMIN can create, update, delete
                        .requestMatchers(HttpMethod.POST, "/api/companies/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/companies/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/companies/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/companies/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/shares/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/shares/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/shares/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
