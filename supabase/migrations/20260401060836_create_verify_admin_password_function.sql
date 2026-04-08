/*
  # Create verify_admin_password RPC function

  This function verifies an admin user's password using pgcrypto's crypt()
  function, avoiding the need for bcrypt libraries in the edge runtime.

  Returns a record with: valid, id, email, full_name, role, is_active
*/

CREATE OR REPLACE FUNCTION verify_admin_password(p_email text, p_password text)
RETURNS TABLE (
  valid      boolean,
  id         uuid,
  email      text,
  full_name  text,
  role       text,
  is_active  boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (u.password_hash = extensions.crypt(p_password, u.password_hash)) AS valid,
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active
  FROM admin_users u
  WHERE u.email = lower(trim(p_email));
END;
$$;
