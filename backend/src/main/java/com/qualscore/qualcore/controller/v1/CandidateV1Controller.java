package com.qualscore.qualcore.controller.v1;

import com.qualscore.qualcore.dto.request.CreateCandidateProfileRequest;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.CreateCandidateProfileResponse;
import com.qualscore.qualcore.service.CandidateProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/candidates")
@RequiredArgsConstructor
@Tag(name = "Candidates v1", description = "Candidate profile management")
public class CandidateV1Controller {

    private final CandidateProfileService candidateProfileService;

    @PostMapping("/profile")
    @Operation(summary = "Create or update candidate profile",
               description = "Creates or updates a candidate profile after payment verification. Requires a verified payment reference. Returns the candidate code used for all subsequent funnel operations.")
    public ResponseEntity<ApiResponse<CreateCandidateProfileResponse>> createProfile(
            @Valid @RequestBody CreateCandidateProfileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(candidateProfileService.createOrUpdate(request)));
    }
}
