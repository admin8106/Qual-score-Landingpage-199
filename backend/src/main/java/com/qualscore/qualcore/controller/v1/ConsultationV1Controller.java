package com.qualscore.qualcore.controller.v1;

import com.qualscore.qualcore.dto.request.CreateConsultationRequest;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.ConsultationListResponse;
import com.qualscore.qualcore.dto.response.ConsultationResponse;
import com.qualscore.qualcore.service.ConsultationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for consultation booking operations (v1).
 *
 * POST /api/v1/consultations
 *   Creates a new consultation booking for a candidate.
 *   Validates candidate existence, blocks duplicate REQUESTED bookings.
 *
 * GET /api/v1/consultations/{candidateReference}
 *   Returns all bookings for a candidate, ordered by most recent first.
 */
@RestController
@RequestMapping("/api/v1/consultations")
@RequiredArgsConstructor
@Tag(name = "Consultations v1", description = "Consultation booking management")
public class ConsultationV1Controller {

    private final ConsultationService consultationService;

    @PostMapping
    @Operation(
            summary = "Create consultation booking",
            description = "Books a consultation slot for a candidate. " +
                          "Candidate must exist. Blocks duplicate REQUESTED bookings. " +
                          "Warns but does not block if no diagnostic report exists yet."
    )
    public ResponseEntity<ApiResponse<ConsultationResponse>> createBooking(
            @Valid @RequestBody CreateConsultationRequest request) {
        ConsultationResponse response = consultationService.createBooking(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(response));
    }

    @GetMapping("/{candidateReference}")
    @Operation(
            summary = "Get consultation bookings",
            description = "Returns all consultation bookings for a candidate, most recent first."
    )
    public ResponseEntity<ApiResponse<ConsultationListResponse>> getBookings(
            @Parameter(description = "Candidate code (candidateReference)", required = true)
            @PathVariable String candidateReference) {
        ConsultationListResponse response = consultationService.getBookings(candidateReference);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
