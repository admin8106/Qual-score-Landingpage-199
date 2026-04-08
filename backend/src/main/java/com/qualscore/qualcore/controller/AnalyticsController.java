package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.LogAnalyticsEventRequest;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.LogAnalyticsEventResponse;
import com.qualscore.qualcore.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Event tracking")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @PostMapping("/event")
    @Operation(summary = "Log analytics event", description = "Records a funnel event (page view, conversion, etc.)")
    public ResponseEntity<ApiResponse<LogAnalyticsEventResponse>> logEvent(
            @Valid @RequestBody LogAnalyticsEventRequest request) {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.logEvent(request)));
    }
}
