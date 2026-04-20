import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BACKEND_URL = "http://34.235.167.52:3200";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function base64urlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getHmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

async function verifyAdminToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const secret = Deno.env.get("ADMIN_JWT_SECRET") ?? "qualcore-admin-jwt-secret-2026";
    const key = await getHmacKey(secret, ["verify"]);
    const data = new TextEncoder().encode(`${header}.${body}`);
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

async function signBackendToken(payload: Record<string, unknown>): Promise<string> {
  const secret = Deno.env.get("BACKEND_JWT_SECRET") ?? "change-this-in-production-use-a-long-random-string";
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64urlEncode(JSON.stringify(payload));
  const data = new TextEncoder().encode(`${header}.${body}`);
  const key = await getHmacKey(secret, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return `${header}.${body}.${base64url(new Uint8Array(sig))}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathWithQuery = url.pathname.replace(/^\/backend-proxy/, "") + url.search;
    const targetUrl = `${BACKEND_URL}${pathWithQuery}`;

    const proxyHeaders = new Headers();
    for (const [key, value] of req.headers.entries()) {
      const lower = key.toLowerCase();
      if (lower === "host" || lower === "x-forwarded-for" || lower === "x-client-info" || lower === "apikey") continue;
      proxyHeaders.set(key, value);
    }

    const isAdminRoute = pathWithQuery.startsWith("/api/v1/admin") || pathWithQuery.startsWith("/api/v1/auth/admin/me");
    const authHeader = req.headers.get("Authorization") ?? "";
    const incomingToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (isAdminRoute && incomingToken) {
      const claims = await verifyAdminToken(incomingToken);
      if (!claims) {
        return new Response(
          JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired admin token" } }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const backendToken = await signBackendToken({
        sub: claims.email ?? claims.sub,
        role: claims.role ?? "ADMIN",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      proxyHeaders.set("Authorization", `Bearer ${backendToken}`);
    }

    const fetchInit: RequestInit = {
      method: req.method,
      headers: proxyHeaders,
    };

    if (req.method !== "GET" && req.method !== "DELETE") {
      fetchInit.body = await req.arrayBuffer();
    }

    const backendResponse = await fetch(targetUrl, fetchInit);

    const responseHeaders = new Headers(corsHeaders);
    for (const [key, value] of backendResponse.headers.entries()) {
      const lower = key.toLowerCase();
      if (lower === "transfer-encoding" || lower === "connection") continue;
      responseHeaders.set(key, value);
    }

    const body = await backendResponse.arrayBuffer();

    return new Response(body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: { code: "PROXY_ERROR", message: String(err) } }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
