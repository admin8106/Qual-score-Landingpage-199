import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const JWT_SECRET = "qualcore-admin-jwt-secret-2026";

async function getKey(usage: KeyUsage[]): Promise<CryptoKey> {
  const secret = Deno.env.get("ADMIN_JWT_SECRET") ?? JWT_SECRET;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64urlEncode(JSON.stringify(payload));
  const data = new TextEncoder().encode(`${header}.${body}`);
  const key = await getKey(["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return `${header}.${body}.${base64url(new Uint8Array(sig))}`;
}

async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const data = new TextEncoder().encode(`${header}.${body}`);
    const key = await getKey(["verify"]);
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!valid) return null;
    const payload = JSON.parse(
      decodeURIComponent(escape(atob(body.replace(/-/g, "+").replace(/_/g, "/")))),
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/admin-auth/, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (req.method === "POST" && (path === "/login" || path === "" || path === "/")) {
      const { email, password } = await req.json() as { email?: string; password?: string };

      if (!email || !password) {
        return jsonResponse(
          { ok: false, error: { code: "VALIDATION_ERROR", message: "Email and password are required" } },
          400,
        );
      }

      const { data: result, error: dbErr } = await supabase
        .rpc("verify_admin_password", {
          p_email: email.trim().toLowerCase(),
          p_password: password,
        })
        .maybeSingle();

      if (dbErr) {
        console.error("[admin-auth] DB error:", dbErr);
        return jsonResponse(
          { ok: false, error: { code: "SERVER_ERROR", message: "Authentication service error" } },
          500,
        );
      }

      if (!result || !result.valid) {
        return jsonResponse(
          { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid credentials" } },
          401,
        );
      }

      if (!result.is_active) {
        return jsonResponse(
          { ok: false, error: { code: "FORBIDDEN", message: "Account is disabled" } },
          403,
        );
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = 86400;
      const accessToken = await signJwt({
        sub: result.id,
        email: result.email,
        full_name: result.full_name,
        role: result.role,
        iat: now,
        exp: now + expiresIn,
      });

      await supabase
        .from("admin_users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", result.id);

      return jsonResponse({
        ok: true,
        data: {
          accessToken,
          tokenType: "Bearer",
          expiresIn,
          email: result.email,
          fullName: result.full_name,
          role: result.role,
          issuedAt: new Date(now * 1000).toISOString(),
        },
      });
    }

    if (req.method === "GET" && path === "/me") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (!token) {
        return jsonResponse(
          { ok: false, error: { code: "UNAUTHORIZED", message: "Missing token" } },
          401,
        );
      }

      const claims = await verifyJwt(token);
      if (!claims || !claims.sub) {
        return jsonResponse(
          { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } },
          401,
        );
      }

      const { data: user } = await supabase
        .from("admin_users")
        .select("id, email, full_name, role, last_login_at, created_at, is_active")
        .eq("id", claims.sub as string)
        .maybeSingle();

      if (!user || !user.is_active) {
        return jsonResponse(
          { ok: false, error: { code: "UNAUTHORIZED", message: "User not found or disabled" } },
          401,
        );
      }

      return jsonResponse({
        ok: true,
        data: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
        },
      });
    }

    return jsonResponse(
      { ok: false, error: { code: "NOT_FOUND", message: "Endpoint not found" } },
      404,
    );
  } catch (e) {
    console.error("[admin-auth] Unhandled error:", e);
    return jsonResponse(
      { ok: false, error: { code: "SERVER_ERROR", message: "Internal server error" } },
      500,
    );
  }
});
