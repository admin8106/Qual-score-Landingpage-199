package com.qualscore.qualcore.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI / Swagger configuration.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * GROUPS
 * ─────────────────────────────────────────────────────────────────────────
 * Two logical groups are exposed in Swagger UI:
 *
 *   Public API  — Candidate-facing diagnostic funnel endpoints.
 *                 No authentication required.
 *                 Path prefix: /api/v1/candidates/**, /api/v1/payments/**,
 *                              /api/v1/reports/**, /api/v1/consultations/**
 *
 *   Admin API   — Internal admin and analytics endpoints.
 *                 Requires Bearer JWT with ROLE_ADMIN.
 *                 Path prefix: /api/v1/admin/**
 *                 Security scheme applied globally to this group.
 *
 * The legacy /api/** endpoints (pre-v1 controller refactor) are visible in
 * the default "all" group but not explicitly grouped.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SECURITY SCHEME
 * ─────────────────────────────────────────────────────────────────────────
 * bearerAuth — HTTP Bearer JWT. Token issued by Supabase Auth or JwtService.
 *              Pass in Authorization: Bearer <token> header.
 *
 * The security requirement is applied per-group, not globally, so public
 * endpoints do not show the lock icon in Swagger UI.
 * ─────────────────────────────────────────────────────────────────────────
 */
@Configuration
public class OpenApiConfig {

    @Value("${app.environment:local}")
    private String environment;

    @Value("${server.port:8080}")
    private String serverPort;

    @Value("${API_DOCS_SERVER_URL:}")
    private String apiDocsServerUrl;

    @Bean
    public OpenAPI openAPI() {
        String localUrl = "http://localhost:" + serverPort;
        String prodUrl = apiDocsServerUrl.isBlank() ? "https://api.qualscore.in" : apiDocsServerUrl;

        return new OpenAPI()
                .info(new Info()
                        .title("QualCore — Employability Diagnostic API")
                        .description("""
                                Backend API for the QualScore Employability Diagnostic Report product.

                                **Flow:**
                                1. Payment Initiation & Verification
                                2. Candidate Profile Submission
                                3. Diagnostic Responses (15 questions)
                                4. LinkedIn Profile Analysis
                                5. Score Calculation
                                6. AI Report Generation
                                7. Consultation Booking

                                **Admin endpoints** require Bearer JWT with `ROLE_ADMIN`.
                                Use the Authorize button (lock icon) to set your token before
                                calling admin endpoints.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("QualScore Engineering")
                                .email("engineering@qualscore.in"))
                        .license(new License().name("Proprietary")))
                .servers(List.of(
                        new Server().url(localUrl).description("Local"),
                        new Server().url(prodUrl).description("Production")
                ))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT token — include ROLE_ADMIN claim for admin endpoints")));
    }

    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
                .group("1-public")
                .displayName("Public API (Candidate Funnel)")
                .pathsToMatch(
                        "/api/v1/candidates/**",
                        "/api/v1/payments/**",
                        "/api/v1/reports/**",
                        "/api/v1/consultations/**"
                )
                .build();
    }

    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
                .group("2-admin")
                .displayName("Admin API (Protected — ROLE_ADMIN)")
                .pathsToMatch("/api/v1/admin/**")
                .addOperationCustomizer((operation, handlerMethod) -> {
                    operation.addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
                    return operation;
                })
                .build();
    }

    @Bean
    public GroupedOpenApi legacyApi() {
        return GroupedOpenApi.builder()
                .group("3-legacy")
                .displayName("Legacy API (Pre-v1)")
                .pathsToMatch(
                        "/api/payment/**",
                        "/api/leads/**",
                        "/api/diagnostic/**",
                        "/api/analysis/**",
                        "/api/report/**",
                        "/api/booking/**",
                        "/api/analytics/**",
                        "/api/admin/**",
                        "/api/system/**"
                )
                .build();
    }
}
