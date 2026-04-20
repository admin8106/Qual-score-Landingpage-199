package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.AnalyzeLinkedInRequest;
import com.qualscore.qualcore.dto.request.LinkedInAnalysisDto;
import com.qualscore.qualcore.dto.response.AnalyzeLinkedInResponse;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.enums.LinkedInIngestionMode;
import com.qualscore.qualcore.linkedin.LinkedInAnalysisOutput;
import com.qualscore.qualcore.linkedin.LinkedInProfileInput;
import com.qualscore.qualcore.service.LinkedInAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

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

        LinkedInProfileInput input = LinkedInProfileInput.builder()
                .linkedinUrl(request.getLinkedinUrl())
                .fullName(request.getCandidateName())
                .currentRole(request.getJobRole())
                .industry(request.getIndustry())
                .experienceYears(request.getYearsExperience())
                .ingestionMode(LinkedInIngestionMode.URL_ONLY)
                .sourceType(LinkedInIngestionMode.URL_ONLY.getCode())
                .build();

        LinkedInAnalysisOutput output = linkedInAnalysisService.analyzeOnly(input);

        Map<String, Object> profileAnalysis = new HashMap<>();
        profileAnalysis.put("headlineClarity", output.getHeadlineClarity());
        profileAnalysis.put("roleClarity", output.getRoleClarity());
        profileAnalysis.put("profileCompleteness", output.getProfileCompleteness());
        profileAnalysis.put("aboutQuality", output.getAboutQuality());
        profileAnalysis.put("experiencePresentation", output.getExperiencePresentation());
        profileAnalysis.put("proofOfWorkVisibility", output.getProofOfWorkVisibility());
        profileAnalysis.put("certificationsSignal", output.getCertificationsSignal());
        profileAnalysis.put("recommendationSignal", output.getRecommendationSignal());
        profileAnalysis.put("activityVisibility", output.getActivityVisibility());
        profileAnalysis.put("careerConsistency", output.getCareerConsistency());
        profileAnalysis.put("growthProgression", output.getGrowthProgression());
        profileAnalysis.put("differentiationStrength", output.getDifferentiationStrength());
        profileAnalysis.put("recruiterAttractiveness", output.getRecruiterAttractiveness());
        profileAnalysis.put("topStrengths", output.getTopStrengths());
        profileAnalysis.put("topConcerns", output.getTopConcerns());
        profileAnalysis.put("summaryNotes", output.getSummaryNotes());

        LinkedInAnalysisDto analysisDto = new LinkedInAnalysisDto();
        analysisDto.setScore(output.getLinkedinScore());
        analysisDto.setCompleteness((double) output.getProfileCompleteness());
        analysisDto.setProfileAnalysis(profileAnalysis);
        analysisDto.setMock(output.isMock());

        AnalyzeLinkedInResponse response = AnalyzeLinkedInResponse.builder()
                .analysis(analysisDto)
                .isMock(output.isMock())
                .analyzedAt(Instant.now().toString())
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
