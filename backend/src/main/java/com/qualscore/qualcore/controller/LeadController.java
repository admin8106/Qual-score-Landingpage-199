package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.SaveCandidateProfileRequest;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.SaveCandidateProfileResponse;
import com.qualscore.qualcore.service.LeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/leads")
@RequiredArgsConstructor
@Tag(name = "Leads", description = "Candidate profile and lead management")
public class LeadController {

    private final LeadService leadService;

    @PostMapping
    @Operation(summary = "Save candidate profile", description = "Creates a new lead and diagnostic session after payment")
    public ResponseEntity<ApiResponse<SaveCandidateProfileResponse>> saveCandidateProfile(
            @Valid @RequestBody SaveCandidateProfileRequest request) {
        SaveCandidateProfileResponse response = leadService.saveCandidateProfile(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }
}
