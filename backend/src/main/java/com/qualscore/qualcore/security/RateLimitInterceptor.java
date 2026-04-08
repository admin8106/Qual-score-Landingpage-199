package com.qualscore.qualcore.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-process rate limiting interceptor using a sliding-window counter per IP.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CURRENT IMPLEMENTATION: In-Memory (Single Node)
 * ─────────────────────────────────────────────────────────────────────────
 * This implementation uses a ConcurrentHashMap per (IP, minute-bucket) key.
 * It is suitable for single-instance deployments and development.
 *
 * Limitations:
 *   - State is lost on restart
 *   - Does NOT work correctly across multiple instances (horizontal scale)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PRODUCTION UPGRADE PATH
 * ─────────────────────────────────────────────────────────────────────────
 * For production multi-instance deployments, replace this with one of:
 *
 * Option A — Redis (recommended):
 *   Use Bucket4j with a Redis backend:
 *   <dependency>
 *     <groupId>com.github.vladimir-bukhtoyarov</groupId>
 *     <artifactId>bucket4j-redis</artifactId>
 *   </dependency>
 *
 * Option B — API Gateway level (preferred for microservices):
 *   Configure rate limiting at the ingress:
 *     AWS API Gateway: Usage Plans + API Keys
 *     Cloudflare: Rate Limiting Rules
 *     nginx: limit_req_zone + limit_req
 *   Remove this interceptor entirely in that case.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONFIGURATION (application.yml)
 * ─────────────────────────────────────────────────────────────────────────
 *   rate-limit:
 *     enabled: true
 *     public-rpm: 60     # requests per minute for public funnel endpoints
 *     admin-rpm: 120     # requests per minute for admin endpoints
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RESPONSE ON LIMIT:
 *   HTTP 429 Too Many Requests
 *   Header: Retry-After: 60
 *   Body: { "ok": false, "error": { "code": "RATE_LIMITED", "message": "..." } }
 * ─────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    @Value("${rate-limit.enabled:false}")
    private boolean enabled;

    @Value("${rate-limit.public-rpm:60}")
    private int publicRpm;

    @Value("${rate-limit.admin-rpm:120}")
    private int adminRpm;

    private final Map<String, AtomicInteger> counters = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        if (!enabled) return true;

        String uri = request.getRequestURI();

        if (isWebhookPath(uri)) return true;

        int limit = uri.startsWith("/api/v1/admin") || uri.startsWith("/api/admin")
                ? adminRpm : publicRpm;

        String clientIp = resolveClientIp(request);
        long minuteBucket = System.currentTimeMillis() / 60_000;
        String key = clientIp + ":" + minuteBucket;

        cleanOldBuckets(minuteBucket);

        AtomicInteger counter = counters.computeIfAbsent(key, k -> new AtomicInteger(0));
        int count = counter.incrementAndGet();

        if (count > limit) {
            log.warn("[RateLimit] EXCEEDED: ip={} uri={} count={} limit={}", clientIp, uri, count, limit);
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write("""
                    {"ok":false,"error":{"code":"RATE_LIMITED","message":"Too many requests. Please try again in 60 seconds."}}
                    """.strip());
            return false;
        }

        return true;
    }

    private boolean isWebhookPath(String uri) {
        return uri.contains("/webhook");
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void cleanOldBuckets(long currentBucket) {
        if (counters.size() > 10_000) {
            counters.entrySet().removeIf(e -> {
                String[] parts = e.getKey().split(":");
                if (parts.length == 2) {
                    try {
                        long bucket = Long.parseLong(parts[1]);
                        return currentBucket - bucket > 2;
                    } catch (NumberFormatException ignored) {}
                }
                return false;
            });
        }
    }
}
