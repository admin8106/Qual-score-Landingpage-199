package com.qualscore.qualcore.controller.v1;

import com.qualscore.qualcore.dto.request.AdminLoginRequest;
import com.qualscore.qualcore.dto.response.AdminLoginResponse;
import com.qualscore.qualcore.dto.response.AdminProfileResponse;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.service.AdminAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Admin authentication endpoints.
 *
 * POST /api/v1/auth/admin/login
 *   Public — accepts email + password, returns a signed JWT.
 *
 * GET  /api/v1/auth/admin/me
 *   Protected (ROLE_ADMIN) — returns the authenticated admin's profile.
 *   Used by the frontend to validate a stored token is still valid and
 *   to restore the admin session after a page refresh.
 */
@RestController
@RequestMapping("/api/v1/auth/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Auth", description = "Admin authentication — login and profile")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    @PostMapping("/login")
    @Operation(summary = "Admin login", description = "Authenticates an admin and returns a JWT access token.")
    public ResponseEntity<ApiResponse<AdminLoginResponse>> login(
            @Valid @RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminAuthService.login(request)));
    }

    @GetMapping("/me")
    @Operation(
            summary = "Get admin profile",
            description = "Returns the authenticated admin's profile. Requires valid Bearer token.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<ApiResponse<AdminProfileResponse>> me(
            @AuthenticationPrincipal String email) {
        return ResponseEntity.ok(ApiResponse.success(adminAuthService.getProfile(email)));
    }
}
