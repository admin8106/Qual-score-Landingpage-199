package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.response.AdminLeadRecord;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.FetchAdminLeadsResponse;
import com.qualscore.qualcore.dto.response.FetchAnalyticsResponse;
import com.qualscore.qualcore.service.AnalyticsService;
import com.qualscore.qualcore.service.LeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Internal admin endpoints — requires authentication")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final LeadService leadService;
    private final AnalyticsService analyticsService;

    @GetMapping("/leads")
    @Operation(summary = "Fetch all leads", description = "Returns paginated list of leads with diagnostic and booking summaries")
    public ResponseEntity<ApiResponse<FetchAdminLeadsResponse>> fetchLeads(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(leadService.fetchAdminLeads(limit, offset, filter, search)));
    }

    @GetMapping("/leads/{leadId}")
    @Operation(summary = "Get lead by ID")
    public ResponseEntity<ApiResponse<AdminLeadRecord>> getLead(@PathVariable UUID leadId) {
        return ResponseEntity.ok(ApiResponse.success(leadService.getLeadById(leadId)));
    }

    @GetMapping("/analytics")
    @Operation(summary = "Fetch funnel analytics", description = "Returns event counts, conversion rates, and daily series")
    public ResponseEntity<ApiResponse<FetchAnalyticsResponse>> fetchAnalytics(
            @RequestParam(defaultValue = "30") int daysBack) {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.fetchAnalytics(daysBack)));
    }
}
