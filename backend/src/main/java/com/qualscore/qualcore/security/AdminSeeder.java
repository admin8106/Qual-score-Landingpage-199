package com.qualscore.qualcore.security;

import com.qualscore.qualcore.service.AdminAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Ensures at least one admin user exists on every startup.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Configuration (env vars)
 * ─────────────────────────────────────────────────────────────────────────
 *   ADMIN_EMAIL        — Email of the initial admin (default: admin@qualscore.in)
 *   ADMIN_PASSWORD     — Password (default: Admin@2024! — CHANGE IN PRODUCTION)
 *   ADMIN_FULL_NAME    — Display name (default: QualScore Admin)
 *   ADMIN_SEED_ENABLED — Set to false to disable seeding (default: true)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Behaviour
 * ─────────────────────────────────────────────────────────────────────────
 * - If the email already exists in admin_users, seeding is skipped
 * - The password is BCrypt-hashed before storage (plain text never persisted)
 * - Re-runs on every startup but is idempotent — safe in multi-instance deploys
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Adding more admins
 * ─────────────────────────────────────────────────────────────────────────
 * Currently only one admin is seeded. To add additional admins:
 *   1. Call AdminAuthService.seedAdminIfNeeded() programmatically, OR
 *   2. INSERT directly into admin_users with a BCrypt hash:
 *      INSERT INTO admin_users (email, password_hash, full_name, role)
 *      VALUES ('ops@qualscore.in', '<bcrypt-hash>', 'Ops Admin', 'ADMIN');
 *
 *      Generate a hash: https://bcrypt-generator.com/ (strength 12)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminSeeder implements CommandLineRunner {

    @Value("${admin.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${admin.email:admin@qualscore.in}")
    private String adminEmail;

    @Value("${admin.password:Admin@2024!}")
    private String adminPassword;

    @Value("${admin.full-name:QualScore Admin}")
    private String adminFullName;

    private final AdminAuthService adminAuthService;

    @Override
    public void run(String... args) {
        if (!seedEnabled) {
            log.info("[AdminSeeder] Seeding disabled via admin.seed.enabled=false");
            return;
        }
        log.info("[AdminSeeder] Checking for admin user email={}", adminEmail);
        adminAuthService.seedAdminIfNeeded(adminEmail, adminPassword, adminFullName);
    }
}
