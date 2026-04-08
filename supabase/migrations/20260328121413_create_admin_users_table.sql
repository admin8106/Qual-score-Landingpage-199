/*
  # Create admin_users table

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null) — login identity
      - `password_hash` (text, not null) — BCrypt-hashed password
      - `full_name` (text) — display name shown in admin UI
      - `role` (text, default 'ADMIN') — role claim embedded in JWT; reserved for future SUPER_ADMIN
      - `is_active` (boolean, default true) — soft-disable accounts without deletion
      - `last_login_at` (timestamptz) — updated on every successful login
      - `created_at` (timestamptz, auto)
      - `updated_at` (timestamptz, auto)

  2. Security
    - RLS enabled; table is write-protected from client side
    - Only service-role (backend) can read/write admin_users
    - No public SELECT policy — all access goes through the Spring Boot backend

  3. Notes
    - Passwords are NEVER stored in plain text; only BCrypt hashes
    - Seeding: the backend AdminSeeder CommandLineRunner inserts the initial admin
      using credentials from ADMIN_EMAIL / ADMIN_PASSWORD env vars at startup
    - Role expansion: add SUPER_ADMIN, VIEWER, etc. as additional role values
*/

CREATE TABLE IF NOT EXISTS admin_users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  password_hash   text NOT NULL,
  full_name       text,
  role            text NOT NULL DEFAULT 'ADMIN',
  is_active       boolean NOT NULL DEFAULT true,
  last_login_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users (is_active);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admin users"
  ON admin_users
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert admin users"
  ON admin_users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update admin users"
  ON admin_users
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
