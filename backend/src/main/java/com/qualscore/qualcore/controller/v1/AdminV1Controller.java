package com.qualscore.qualcore.controller.v1;

import com.qualscore.qualcore.dto.response.AdminLeadV1ListResponse;
import com.qualscore.qualcore.dto.response.AdminLeadV1Record;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.CommunicationEventResponse;
import com.qualscore.qualcore.dto.response.EarlyLeadRecord;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.EarlyLead;
import com.qualscore.qualcore.exception.ResourceNotFoundException;
import com.qualscore.qualcore.integration.config.FeatureFlagService;
import com.qualscore.qualcore.integration.config.ProviderConfigCache;
import com.qualscore.qualcore.repository.CandidateProfileRepository;
import com.qualscore.qualcore.repository.EarlyLeadRepository;
import com.qualscore.qualcore.service.AdminLeadService;
import com.qualscore.qualcore.service.CommunicationEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin REST controller for lead management (v1).
 * All endpoints require Bearer token authentication.
 *
 * GET  /api/v1/admin/leads
 *   Paginated lead list with filter and search support.
 *
 * GET  /api/v1/admin/leads/{candidateReference}
 *   Full aggregated lead record for a single candidate.
 *
 * GET  /api/v1/admin/leads/{candidateReference}/comms
 *   All communication events for a candidate (newest first).
 *
 * POST /api/v1/admin/leads/{candidateReference}/resend
 *   Manually resend report-ready WhatsApp + email for a candidate.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin v1", description = "Internal admin endpoints — requires authentication")
@SecurityRequirement(name = "bearerAuth")
public class AdminV1Controller {

    private final AdminLeadService adminLeadService;
    private final CommunicationEventService communicationEventService;
    private final CandidateProfileRepository candidateProfileRepository;
    private final EarlyLeadRepository earlyLeadRepository;
    private final ProviderConfigCache providerConfigCache;
    private final FeatureFlagService featureFlagService;

    @GetMapping("/leads")
    @Operation(
            summary = "List all leads",
            description = "Returns paginated candidate leads with score, report, booking, payment status " +
                          "and derived lead priority. Supports filter and free-text search."
    )
    public ResponseEntity<ApiResponse<AdminLeadV1ListResponse>> fetchLeads(
            @Parameter(description = "Max records per page (default 50)")
            @RequestParam(defaultValue = "50") int limit,

            @Parameter(description = "Offset for pagination (default 0)")
            @RequestParam(defaultValue = "0") int offset,

            @Parameter(description = "Filter: all | high | medium | reported | booked")
            @RequestParam(defaultValue = "all") String filter,

            @Parameter(description = "Search by name, email, phone, or candidate code")
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(
                ApiResponse.success(adminLeadService.fetchLeads(limit, offset, filter, search)));
    }

    @GetMapping("/leads/{candidateReference}")
    @Operation(
            summary = "Get lead by candidate reference",
            description = "Returns the full aggregated lead record for a candidate, " +
                          "including score, tags, priority, booking and payment status."
    )
    public ResponseEntity<ApiResponse<AdminLeadV1Record>> getLead(
            @Parameter(description = "Candidate code (candidateReference)", required = true)
            @PathVariable String candidateReference) {
        return ResponseEntity.ok(
                ApiResponse.success(adminLeadService.getLeadByCandidateReference(candidateReference)));
    }

    @GetMapping("/leads/{candidateReference}/comms")
    @Operation(
            summary = "Get communication events for a candidate",
            description = "Returns all WhatsApp and email communication events for a candidate, newest first."
    )
    public ResponseEntity<ApiResponse<List<CommunicationEventResponse>>> getCommsForLead(
            @Parameter(description = "Candidate code", required = true)
            @PathVariable String candidateReference) {
        CandidateProfile candidate = candidateProfileRepository
                .findByCandidateCode(candidateReference)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate", candidateReference));
        List<CommunicationEventResponse> events =
                communicationEventService.getEventsForCandidate(candidate.getId());
        return ResponseEntity.ok(ApiResponse.success(events));
    }

    @PostMapping("/leads/{candidateReference}/resend")
    @Operation(
            summary = "Resend report notifications",
            description = "Manually triggers a fresh WhatsApp message and email for the candidate's report. " +
                          "Creates new event rows so history is preserved. Safe to call multiple times."
    )
    public ResponseEntity<ApiResponse<String>> resendNotifications(
            @Parameter(description = "Candidate code", required = true)
            @PathVariable String candidateReference) {
        communicationEventService.resendReportNotifications(candidateReference, null);
        return ResponseEntity.ok(ApiResponse.success("Resend triggered for candidateReference=" + candidateReference));
    }

    @GetMapping("/early-leads")
    @Operation(
            summary = "List early / incomplete leads",
            description = "Returns partial funnel records from the early_leads table. " +
                          "Use incomplete=true to filter to non-converted leads only (default: all)."
    )
    public ResponseEntity<ApiResponse<List<EarlyLeadRecord>>> fetchEarlyLeads(
            @Parameter(description = "Limit results (default 100)")
            @RequestParam(defaultValue = "100") int limit,
            @Parameter(description = "Filter to incomplete leads only (default true)")
            @RequestParam(defaultValue = "true") boolean incomplete) {
        PageRequest page = PageRequest.of(0, Math.min(limit, 500), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<EarlyLead> results = incomplete
                ? earlyLeadRepository.findByCompleteOrderByCreatedAtDesc(false, page)
                : earlyLeadRepository.findAllByOrderByCreatedAtDesc(page);

        List<EarlyLeadRecord> records = results.getContent().stream()
                .map(el -> EarlyLeadRecord.builder()
                        .id(el.getId().toString())
                        .email(el.getEmail())
                        .name(el.getName())
                        .phone(el.getPhone())
                        .funnelStage(el.getFunnelStage())
                        .dropTags(el.getDropTags())
                        .paymentStatus(el.getPaymentStatus())
                        .candidateCode(el.getCandidateCode())
                        .reportGenerated(el.isReportGenerated())
                        .complete(el.isComplete())
                        .createdAt(el.getCreatedAt() != null ? el.getCreatedAt().toString() : null)
                        .updatedAt(el.getUpdatedAt() != null ? el.getUpdatedAt().toString() : null)
                        .build())
                .toList();

        return ResponseEntity.ok(ApiResponse.success(records));
    }

    @PostMapping("/integrations/refresh-cache")
    @Operation(
            summary = "Refresh integration provider config cache",
            description = "Forces an immediate reload of provider configs and feature flags from the database. " +
                          "Use this after updating provider settings in the dashboard to apply changes without waiting for the next scheduled refresh."
    )
    public ResponseEntity<ApiResponse<String>> refreshIntegrationCache() {
        providerConfigCache.refresh();
        featureFlagService.refresh();
        return ResponseEntity.ok(ApiResponse.success("Integration cache refreshed successfully"));
    }
}
