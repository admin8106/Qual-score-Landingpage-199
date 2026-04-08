package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.AnalyzeLinkedInRequest;
import com.qualscore.qualcore.dto.response.AnalyzeLinkedInResponse;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.service.LinkedInAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
@Tag(name = "Analysis", description = "LinkedIn profile analysis")
public class AnalysisController {

    private final LinkedInAnalysisService linkedInAnalysisService;

    @PostMapping("/linkedin")
    @Operation(summary = "Analyze LinkedIn profile", description = "Fetches the LinkedIn profile via Proxycurl and runs LLM analysis")
    public ResponseEntity<ApiResponse<AnalyzeLinkedInResponse>> analyzeLinkedIn(
            @Valid @RequestBody AnalyzeLinkedInRequest request) {
        return ResponseEntity.ok(ApiResponse.success(linkedInAnalysisService.analyzeProfile(request)));
    }
}
