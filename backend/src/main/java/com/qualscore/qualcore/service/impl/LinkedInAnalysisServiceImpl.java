package com.qualscore.qualcore.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.dto.request.AnalyzeLinkedInRequest;
import com.qualscore.qualcore.dto.response.AnalyzeLinkedInResponse;
import com.qualscore.qualcore.dto.request.LinkedInAnalysisDto;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.LinkedInAnalysisResult;
import com.qualscore.qualcore.enums.LinkedInAnalysisStatus;
import com.qualscore.qualcore.enums.LinkedInIngestionMode;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.linkedin.LinkedInAnalysisClient;
import com.qualscore.qualcore.linkedin.LinkedInAnalysisOutput;
import com.qualscore.qualcore.linkedin.LinkedInProfileInput;
import com.qualscore.qualcore.repository.CandidateProfileRepository;
import com.qualscore.qualcore.repository.LinkedInAnalysisResultRepository;
import com.qualscore.qualcore.service.LinkedInAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * LinkedIn analysis service implementation.
 *
 * Responsibilities:
 *   1. Delegate analysis to the active {@link LinkedInAnalysisClient} (strategy pattern)
 *   2. Map the {@link LinkedInAnalysisOutput} to the {@link LinkedInAnalysisResult} JPA entity
 *   3. Persist the result with full dimension scores, JSON sub-fields, and status
 *   4. Return the canonical output to the orchestration layer
 *
 * ─────────────────────────────────────────────────────────
 * Extensibility Contract:
 *   This service does NOT know which analysis strategy is active.
 *   Swapping from RULE_BASED → ENRICHMENT_API → AI_PROMPT requires only:
 *     - Adding a new {@link LinkedInAnalysisClient} implementation
 *     - Marking it {@code @Primary} (or using qualifier injection)
 *   Zero changes to this service.
 * ─────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LinkedInAnalysisServiceImpl implements LinkedInAnalysisService {

    private final LinkedInAnalysisClient analysisClient;
    private final LinkedInAnalysisResultRepository linkedInRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public LinkedInAnalysisOutput analyzeAndPersist(LinkedInProfileInput input, UUID candidateProfileId) {
        log.info("Starting LinkedIn analysis: candidateProfileId={}, sourceType={}, url={}",
                candidateProfileId, input.getSourceType(), input.getLinkedinUrl());

        CandidateProfile candidate = candidateProfileRepository.findById(candidateProfileId)
                .orElseThrow(() -> new BusinessException(
                        "CANDIDATE_NOT_FOUND",
                        "No candidate profile found for ID: " + candidateProfileId,
                        HttpStatus.NOT_FOUND));

        LinkedInAnalysisOutput output = runAnalysis(input);

        persistResult(candidate, output);

        log.info("LinkedIn analysis persisted: candidateProfileId={}, score={}, mock={}, sourceType={}",
                candidateProfileId, output.getLinkedinScore(), output.isMock(), output.getSourceType());

        return output;
    }

    @Override
    @Transactional(readOnly = true)
    public LinkedInAnalysisOutput analyzeOnly(LinkedInProfileInput input) {
        log.info("LinkedIn analysis (no persist): sourceType={}, url={}", input.getSourceType(), input.getLinkedinUrl());
        return runAnalysis(input);
    }

    @Override
    public AnalyzeLinkedInResponse analyzeProfile(AnalyzeLinkedInRequest request) {
        LinkedInProfileInput input = LinkedInProfileInput.builder()
                .linkedinUrl(request.getLinkedinUrl())
                .fullName(request.getCandidateName())
                .currentRole(request.getJobRole())
                .industry(request.getIndustry())
                .experienceYears(request.getYearsExperience())
                .ingestionMode(LinkedInIngestionMode.URL_ONLY)
                .sourceType(LinkedInIngestionMode.URL_ONLY.getCode())
                .build();

        LinkedInAnalysisOutput output = analyzeOnly(input);

        LinkedInAnalysisDto dto = new LinkedInAnalysisDto();
        dto.setScore(output.getLinkedinScore());
        dto.setMock(output.isMock());

        return AnalyzeLinkedInResponse.builder()
                .analysis(dto)
                .isMock(output.isMock())
                .analyzedAt(OffsetDateTime.now().toString())
                .build();
    }

    private LinkedInAnalysisOutput runAnalysis(LinkedInProfileInput input) {
        try {
            return analysisClient.analyze(input);
        } catch (Exception e) {
            log.error("LinkedIn analysis client failed [sourceType={}]: {}",
                    analysisClient.getSourceType(), e.getMessage(), e);
            return buildFallbackOutput(input);
        }
    }

    private void persistResult(CandidateProfile candidate, LinkedInAnalysisOutput output) {
        String summaryNotesJson = toJson(output.getSummaryNotes());
        String topStrengthsJson = toJson(output.getTopStrengths());
        String topConcernsJson  = toJson(output.getTopConcerns());

        String ingestionModeCode  = output.getIngestionMode() != null
                ? output.getIngestionMode().getCode() : null;
        String confidenceValue    = output.getAnalysisConfidence() != null
                ? output.getAnalysisConfidence().name() : null;
        String coverageValue      = output.getAnalysisCoverage() != null
                ? output.getAnalysisCoverage().name() : null;

        LinkedInAnalysisResult entity = LinkedInAnalysisResult.builder()
                .candidateProfile(candidate)
                .headlineClarity(output.getHeadlineClarity())
                .roleClarity(output.getRoleClarity())
                .profileCompleteness(output.getProfileCompleteness())
                .aboutQuality(output.getAboutQuality())
                .experiencePresentation(output.getExperiencePresentation())
                .proofOfWorkVisibility(output.getProofOfWorkVisibility())
                .certificationsSignal(output.getCertificationsSignal())
                .recommendationSignal(output.getRecommendationSignal())
                .activityVisibility(output.getActivityVisibility())
                .careerConsistency(output.getCareerConsistency())
                .growthProgression(output.getGrowthProgression())
                .differentiationStrength(output.getDifferentiationStrength())
                .recruiterAttractiveness(output.getRecruiterAttractiveness())
                .summaryNotesJson(summaryNotesJson)
                .topStrengthsJson(topStrengthsJson)
                .topConcernsJson(topConcernsJson)
                .linkedinScore(toBigDecimal(output.getLinkedinScore()))
                .analysisStatus(LinkedInAnalysisStatus.COMPLETED)
                .ingestionMode(ingestionModeCode)
                .analysisConfidence(confidenceValue)
                .analysisCoverage(coverageValue)
                .build();

        linkedInRepository.save(entity);
    }

    /**
     * Builds a safe fallback output when the analysis client throws an unhandled exception.
     * All scores default to 5 (neutral), mock=true, sourceType="FALLBACK".
     */
    private LinkedInAnalysisOutput buildFallbackOutput(LinkedInProfileInput input) {
        log.warn("Using fallback LinkedIn output for url={}", input.getLinkedinUrl());
        return LinkedInAnalysisOutput.builder()
                .headlineClarity(5)
                .roleClarity(5)
                .profileCompleteness(5)
                .aboutQuality(5)
                .experiencePresentation(5)
                .proofOfWorkVisibility(5)
                .certificationsSignal(5)
                .recommendationSignal(5)
                .activityVisibility(5)
                .careerConsistency(5)
                .growthProgression(5)
                .differentiationStrength(5)
                .recruiterAttractiveness(5)
                .summaryNotes(List.of("LinkedIn analysis encountered an issue — using neutral baseline scores."))
                .topStrengths(List.of("Profile URL is present"))
                .topConcerns(List.of("Analysis could not be completed — manual review recommended"))
                .linkedinScore(5.0)
                .sourceType(com.qualscore.qualcore.enums.LinkedInIngestionMode.FALLBACK.getCode())
                .ingestionMode(com.qualscore.qualcore.enums.LinkedInIngestionMode.FALLBACK)
                .analysisConfidence(com.qualscore.qualcore.enums.LinkedInIngestionMode.AnalysisConfidence.NONE)
                .analysisCoverage(com.qualscore.qualcore.enums.LinkedInIngestionMode.AnalysisCoverage.NONE)
                .mock(true)
                .build();
    }

    private String toJson(Object value) {
        if (value == null) return "[]";
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize LinkedIn analysis field to JSON", e);
            return "[]";
        }
    }

    private BigDecimal toBigDecimal(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP);
    }
}
