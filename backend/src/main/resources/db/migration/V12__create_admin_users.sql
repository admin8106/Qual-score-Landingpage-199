-- ──────────────────────────────────────────────────────────────────────────────
-- V12: Create admin_users table
--
-- Stores backend admin credentials (BCrypt-hashed passwords only).
-- All access is via Spring Boot service — no direct client access.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       TEXT,
    role            TEXT NOT NULL DEFAULT 'ADMIN',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email     ON admin_users (email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users (is_active);
