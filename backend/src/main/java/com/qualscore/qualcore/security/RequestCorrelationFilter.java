package com.qualscore.qualcore.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Assigns a unique correlation ID to every inbound HTTP request and propagates
 * it through:
 *   - The SLF4J MDC (Mapped Diagnostic Context) so every log line for this
 *     request includes the ID automatically via the log pattern.
 *   - The response header X-Request-Id so callers can trace requests end-to-end.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Header resolution order:
 *   1. X-Correlation-Id   (forwarded from API gateway / load balancer)
 *   2. X-Request-Id       (set by frontend or Postman)
 *   3. Generated UUID     (fallback — always guaranteed)
 *
 * MDC keys:
 *   requestId   — the resolved/generated ID
 *   method      — HTTP method
 *   uri         — request URI (path only, never includes query params)
 *   remoteIp    — client IP (respects X-Forwarded-For from trusted proxies)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Logging pattern integration (application.yml):
 *   Add %X{requestId} and %X{remoteIp} to the console pattern:
 *   "%d{HH:mm:ss} [%X{requestId}] [%X{remoteIp}] %-5level %logger{36} - %msg%n"
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Security note:
 *   The X-Forwarded-For header is trusted here. If the service is not
 *   behind a trusted reverse proxy, remove the X-Forwarded-For lookup
 *   from resolveClientIp() to prevent IP spoofing via forged headers.
 */
@Component
@Order(1)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    public static final String HEADER_CORRELATION_ID = "X-Correlation-Id";
    public static final String HEADER_REQUEST_ID     = "X-Request-Id";

    public static final String MDC_REQUEST_ID  = "requestId";
    public static final String MDC_METHOD      = "method";
    public static final String MDC_URI         = "uri";
    public static final String MDC_REMOTE_IP   = "remoteIp";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requestId = resolveRequestId(request);
        String clientIp  = resolveClientIp(request);

        try {
            MDC.put(MDC_REQUEST_ID, requestId);
            MDC.put(MDC_METHOD,     request.getMethod());
            MDC.put(MDC_URI,        request.getRequestURI());
            MDC.put(MDC_REMOTE_IP,  clientIp);

            response.setHeader(HEADER_REQUEST_ID, requestId);

            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_REQUEST_ID);
            MDC.remove(MDC_METHOD);
            MDC.remove(MDC_URI);
            MDC.remove(MDC_REMOTE_IP);
        }
    }

    private String resolveRequestId(HttpServletRequest request) {
        String correlationId = request.getHeader(HEADER_CORRELATION_ID);
        if (StringUtils.hasText(correlationId) && isValidId(correlationId)) {
            return correlationId;
        }
        String requestId = request.getHeader(HEADER_REQUEST_ID);
        if (StringUtils.hasText(requestId) && isValidId(requestId)) {
            return requestId;
        }
        return UUID.randomUUID().toString();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private boolean isValidId(String id) {
        return id.length() <= 128 && id.matches("[a-zA-Z0-9\\-_]+");
    }
}
