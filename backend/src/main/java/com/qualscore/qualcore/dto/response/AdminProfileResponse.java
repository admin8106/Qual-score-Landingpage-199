package com.qualscore.qualcore.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminProfileResponse(
        UUID id,
        String email,
        String fullName,
        String role,
        OffsetDateTime lastLoginAt,
        OffsetDateTime createdAt
) {}
