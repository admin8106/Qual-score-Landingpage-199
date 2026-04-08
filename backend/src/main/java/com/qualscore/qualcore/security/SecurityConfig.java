package com.qualscore.qualcore.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security configuration for the QualScore backend API.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SECURITY MODEL
 * ─────────────────────────────────────────────────────────────────────────
 * The API is split into three zones:
 *
 * PUBLIC (no auth required):
 *   - All diagnostic funnel endpoints: /api/v1/candidates/**, /api/v1/payments/**,
 *     /api/v1/reports/**, /api/v1/consultations/**
 *   - Admin auth endpoint: /api/v1/auth/admin/login  (returns JWT)
 *   - Webhook endpoint: /api/v1/payments/webhook
 *     Authentication = gateway signature verification (not JWT)
 *   - Legacy endpoints: /api/payment/**, /api/diagnostic/**, etc.
 *   - Health/version/OpenAPI endpoints
 *
 * PROTECTED (Bearer JWT required):
 *   - /api/v1/admin/**  — ROLE_ADMIN only
 *   - /api/v1/auth/admin/me — ROLE_ADMIN only (validates token + returns profile)
 *   - /api/admin/**     — legacy admin endpoints
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ADMIN AUTH FLOW
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Frontend POSTs to /api/v1/auth/admin/login with email + password
 * 2. AdminAuthService verifies credentials against admin_users table (BCrypt)
 * 3. On success, JwtService issues a signed JWT with sub=email, role=ADMIN
 * 4. Frontend stores token in sessionStorage and sends it as Bearer header
 * 5. JwtAuthenticationFilter validates the token on every protected request
 *
 * Password hashing: BCrypt with strength 12 (configurable via BCRYPT_STRENGTH).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SEEDING
 * ─────────────────────────────────────────────────────────────────────────
 * AdminSeeder runs at startup and creates the first admin if none exist.
 * Set ADMIN_EMAIL and ADMIN_PASSWORD env vars.
 * Default (dev only): admin@qualscore.in / Admin@2024!
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CSRF
 * ─────────────────────────────────────────────────────────────────────────
 * CSRF is disabled — all state-changing requests use Bearer tokens or
 * are public webhooks authenticated by gateway signature.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CORS
 * ─────────────────────────────────────────────────────────────────────────
 * Allowed origins: cors.allowed-origins or CORS_ALLOWED_ORIGINS env var.
 * Do NOT use wildcard (*) in production when credentials are involved.
 * ─────────────────────────────────────────────────────────────────────────
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private List<String> allowedOrigins;

    @Value("${security.bcrypt-strength:12}")
    private int bcryptStrength;

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RequestCorrelationFilter requestCorrelationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(bcryptStrength);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .contentTypeOptions(c -> {})
                        .frameOptions(f -> f.deny()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers(
                                "/health",
                                "/api/system/**",
                                "/actuator/health",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        .requestMatchers(
                                "/api/v1/candidates/**",
                                "/api/v1/payments/**",
                                "/api/v1/reports/**",
                                "/api/v1/consultations/**"
                        ).permitAll()

                        .requestMatchers("/api/v1/auth/admin/login").permitAll()

                        .requestMatchers(
                                "/api/payment/**",
                                "/api/leads",
                                "/api/diagnostic/**",
                                "/api/analysis/**",
                                "/api/report/**",
                                "/api/booking/**",
                                "/api/analytics/**",
                                "/api/webhooks/whatsapp"
                        ).permitAll()

                        .requestMatchers("/api/v1/admin/**", "/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/auth/admin/me").hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(requestCorrelationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "X-Request-Id",
                "X-Correlation-Id"
        ));
        config.setExposedHeaders(List.of("X-Request-Id"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
