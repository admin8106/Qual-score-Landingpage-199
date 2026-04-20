package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.VersionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@Tag(name = "System", description = "Health and version endpoints")
public class SystemController {

    @Value("${spring.application.name:qualcore}")
    private String appName;

    @Value("${app.version:1.0.0}")
    private String appVersion;

    @Value("${app.environment:local}")
    private String environment;

    @GetMapping("/health")
    @Operation(summary = "Root health check", description = "Render / load-balancer liveness probe")
    public ResponseEntity<Map<String, String>> healthRoot() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    @GetMapping("/api/system/health")
    @Operation(summary = "Health check", description = "Returns OK if the service is running")
    public ResponseEntity<ApiResponse<String>> health() {
        return ResponseEntity.ok(ApiResponse.success("OK"));
    }

    @GetMapping("/api/system/version")
    @Operation(summary = "Version info", description = "Returns application version and environment details")
    public ResponseEntity<ApiResponse<VersionResponse>> version() {
        VersionResponse response = VersionResponse.builder()
                .name(appName)
                .version(appVersion)
                .environment(environment)
                .buildTime(java.time.Instant.now().toString())
                .javaVersion(System.getProperty("java.version"))
                .build();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
