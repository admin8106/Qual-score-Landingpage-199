package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.dto.request.AdminLoginRequest;
import com.qualscore.qualcore.dto.response.AdminLoginResponse;
import com.qualscore.qualcore.dto.response.AdminProfileResponse;
import com.qualscore.qualcore.entity.AdminUser;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.repository.AdminUserRepository;
import com.qualscore.qualcore.security.JwtService;
import com.qualscore.qualcore.service.AdminAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Handles admin authentication: login, profile fetch, and first-run seeding.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Login flow
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Look up admin_user by email (case-insensitive)
 * 2. Verify is_active = true
 * 3. BCrypt-verify submitted password against stored hash
 * 4. Update last_login_at
 * 5. Issue signed JWT with sub=email, role=<admin role>
 *
 * Security notes:
 * - Password is NEVER logged or returned in any response
 * - Invalid credentials return the same generic message regardless of
 *   whether the email exists (prevents email enumeration)
 * - BCrypt work factor ≥ 12 means timing attacks are not a concern at scale
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthServiceImpl implements AdminAuthService {

    private static final String INVALID_CREDENTIALS_MSG = "Invalid email or password";

    @Value("${security.jwt.expiration-ms:86400000}")
    private long expirationMs;

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    @Transactional
    public AdminLoginResponse login(AdminLoginRequest request) {
        AdminUser admin = adminUserRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> {
                    log.warn("[AdminAuth] Login attempt for unknown email={}", request.email());
                    return new BusinessException(INVALID_CREDENTIALS_MSG);
                });

        if (!admin.isActive()) {
            log.warn("[AdminAuth] Login attempt for inactive admin email={}", request.email());
            throw new BusinessException(INVALID_CREDENTIALS_MSG);
        }

        if (!passwordEncoder.matches(request.password(), admin.getPasswordHash())) {
            log.warn("[AdminAuth] Invalid password for email={}", request.email());
            throw new BusinessException(INVALID_CREDENTIALS_MSG);
        }

        admin.setLastLoginAt(OffsetDateTime.now());
        adminUserRepository.save(admin);

        String token = jwtService.generateToken(admin.getEmail(), admin.getRole());
        log.info("[AdminAuth] Login successful for email={} role={}", admin.getEmail(), admin.getRole());

        return AdminLoginResponse.of(token, expirationMs,
                admin.getEmail(), admin.getFullName(), admin.getRole());
    }

    @Override
    @Transactional(readOnly = true)
    public AdminProfileResponse getProfile(String email) {
        AdminUser admin = adminUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("Admin not found"));
        return new AdminProfileResponse(
                admin.getId(),
                admin.getEmail(),
                admin.getFullName(),
                admin.getRole(),
                admin.getLastLoginAt(),
                admin.getCreatedAt()
        );
    }

    @Override
    @Transactional
    public void seedAdminIfNeeded(String email, String rawPassword, String fullName) {
        if (adminUserRepository.existsByEmailIgnoreCase(email)) {
            log.info("[AdminAuth] Seed skipped — admin already exists email={}", email);
            return;
        }

        AdminUser admin = AdminUser.builder()
                .email(email.toLowerCase())
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName(fullName != null && !fullName.isBlank() ? fullName : "Admin")
                .role("ADMIN")
                .isActive(true)
                .build();

        adminUserRepository.save(admin);
        log.info("[AdminAuth] Seeded admin user email={}", email);
    }
}
