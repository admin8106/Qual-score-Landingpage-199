package com.qualscore.qualcore.dto.response;

import java.time.OffsetDateTime;

public record AdminLoginResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        String email,
        String fullName,
        String role,
        OffsetDateTime issuedAt
) {
    public static AdminLoginResponse of(String token, long expiresInMs,
                                        String email, String fullName, String role) {
        return new AdminLoginResponse(
                token,
                "Bearer",
                expiresInMs / 1000,
                email,
                fullName,
                role,
                OffsetDateTime.now()
        );
    }
}
