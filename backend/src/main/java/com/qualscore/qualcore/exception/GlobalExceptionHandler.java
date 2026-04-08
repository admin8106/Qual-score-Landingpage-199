package com.qualscore.qualcore.exception;

import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.ValidationFieldError;
import com.qualscore.qualcore.security.RequestCorrelationFilter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

/**
 * Global exception handler with production-safe error responses.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SANITIZATION RULES
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Internal errors (5xx) NEVER expose exception messages, stack traces,
 *    class names, or internal paths to the client response.
 *
 * 2. Business errors (4xx from BusinessException) expose the message only
 *    when it was explicitly written to be user-facing. Avoid passing raw
 *    JPA/SQL exception messages into BusinessException.
 *
 * 3. Every response includes the requestId from MDC for client-side tracing.
 *
 * 4. Logs are structured:
 *    - WARN for expected client errors (4xx)
 *    - ERROR for unexpected server errors (5xx) with full stack trace
 *    - No logging of request bodies, passwords, or sensitive params
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RATE LIMIT EXTENSION POINT
 * ─────────────────────────────────────────────────────────────────────────
 * When rate limiting is active (via RateLimitInterceptor), a
 * RateLimitExceededException should be thrown and caught here:
 *
 *   @ExceptionHandler(RateLimitExceededException.class)
 *   public ResponseEntity<...> handleRateLimit(RateLimitExceededException ex) {
 *       response.setHeader("Retry-After", "60");
 *       return ResponseEntity.status(429).body(ApiResponse.error("RATE_LIMITED", ...));
 *   }
 * ─────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException ex,
                                                                      HttpServletRequest request) {
        log.warn("[{}] Business exception [{}]: {}", requestId(), ex.getErrorCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getHttpStatus())
                .body(ApiResponse.error(ex.getErrorCode(), ex.getMessage(), null, requestId()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex) {
        List<ValidationFieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(this::buildFieldError)
                .toList();
        log.warn("[{}] Validation failed: {} field error(s)", requestId(), fieldErrors.size());
        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiResponse.error("VALIDATION_FAILED", "Request validation failed", fieldErrors, requestId()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = "Invalid value for parameter '%s'".formatted(ex.getName());
        log.warn("[{}] Type mismatch: param={}", requestId(), ex.getName());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("INVALID_PARAMETER", message, null, requestId()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("[{}] Resource not found: {}", requestId(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("RESOURCE_NOT_FOUND", ex.getMessage(), null, requestId()));
    }

    @ExceptionHandler(PaymentVerificationException.class)
    public ResponseEntity<ApiResponse<Void>> handlePaymentVerification(PaymentVerificationException ex) {
        log.warn("[{}] Payment verification failed: {}", requestId(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiResponse.error("PAYMENT_VERIFICATION_FAILED", ex.getMessage(), null, requestId()));
    }

    @ExceptionHandler(ExternalServiceException.class)
    public ResponseEntity<ApiResponse<Void>> handleExternalService(ExternalServiceException ex) {
        log.error("[{}] External service error: {}", requestId(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(ApiResponse.error("EXTERNAL_SERVICE_ERROR",
                        "An upstream service is unavailable. Please try again.", null, requestId()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(AuthenticationException ex) {
        log.warn("[{}] Authentication failed", requestId());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("UNAUTHORIZED", "Authentication required", null, requestId()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        log.warn("[{}] Access denied", requestId());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("FORBIDDEN",
                        "You do not have permission to access this resource", null, requestId()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnhandledException(Exception ex,
                                                                        HttpServletRequest request) {
        log.error("[{}] Unhandled exception on {} {}: {}",
                requestId(), request.getMethod(), request.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("INTERNAL_ERROR",
                        "An unexpected error occurred. Reference: " + requestId(), null, requestId()));
    }

    private String requestId() {
        String id = MDC.get(RequestCorrelationFilter.MDC_REQUEST_ID);
        return id != null ? id : "no-request-id";
    }

    private ValidationFieldError buildFieldError(FieldError error) {
        return ValidationFieldError.builder()
                .field(error.getField())
                .rejectedValue(sanitizeRejectedValue(error.getRejectedValue()))
                .message(error.getDefaultMessage())
                .build();
    }

    private Object sanitizeRejectedValue(Object value) {
        if (value == null) return null;
        String str = value.toString();
        if (str.length() > 200) return str.substring(0, 200) + "...[truncated]";
        return str;
    }
}
