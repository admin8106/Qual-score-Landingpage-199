package com.qualscore.qualcore.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.qualscore.qualcore.exception.ApiError;
import lombok.Getter;

/**
 * Standard envelope for all API responses.
 *
 * Fields:
 *   ok        — true on success, false on error
 *   data      — response payload (null on error)
 *   error     — error descriptor (null on success)
 *   requestId — correlation ID for client-side tracing (always present)
 *
 * The requestId is set from the MDC by the GlobalExceptionHandler and
 * is also echoed in the X-Request-Id response header by the
 * RequestCorrelationFilter. Clients can use it to report issues and
 * correlate with server-side logs.
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean ok;
    private final T data;
    private final ApiError error;
    private final String requestId;

    private ApiResponse(boolean ok, T data, ApiError error, String requestId) {
        this.ok        = ok;
        this.data      = data;
        this.error     = error;
        this.requestId = requestId;
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(true, null, null, null);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, ApiError.builder()
                .code(code).message(message).build(), null);
    }

    public static <T> ApiResponse<T> error(String code, String message, Object details) {
        return new ApiResponse<>(false, null, ApiError.builder()
                .code(code).message(message).details(details).build(), null);
    }

    public static <T> ApiResponse<T> error(String code, String message, Object details, String requestId) {
        return new ApiResponse<>(false, null, ApiError.builder()
                .code(code).message(message).details(details).build(), requestId);
    }
}
