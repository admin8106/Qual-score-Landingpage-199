package com.qualscore.qualcore.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.audit.AuditEventType;
import com.qualscore.qualcore.audit.AuditLogService;
import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.constants.DiagnosticConstants;
import com.qualscore.qualcore.dto.request.DiagnosticAnalysisTriggerRequest;
import com.qualscore.qualcore.dto.request.DiagnosticAnswerRequest;
import com.qualscore.qualcore.dto.response.DiagnosticAnalysisResponse;
import com.qualscore.qualcore.dto.response.DiagnosticAnalysisStatusResponse;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.DiagnosticQuestionResponse;
import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.LinkedInAnalysisResult;
import com.qualscore.qualcore.enums.ScoreBand;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.linkedin.LinkedInAnalysisOutput;
import com.qualscore.qualcore.linkedin.LinkedInProfileInput;
import com.qualscore.qualcore.linkedin.ProfileIngestionService;
import com.qualscore.qualcore.repository.CandidateProfileRepository;
import com.qualscore.qualcore.repository.DiagnosticQuestionResponseRepository;
import com.qualscore.qualcore.repository.DiagnosticReportRepository;
import com.qualscore.qualcore.repository.DiagnosticScoreRepository;
import com.qualscore.qualcore.repository.LinkedInAnalysisResultRepository;
import com.qualscore.qualcore.service.DiagnosticAnalysisOrchestrationService;
import com.qualscore.qualcore.service.DiagnosticScoringService;
import com.qualscore.qualcore.service.FinalScoreCalculator;
import com.qualscore.qualcore.service.LinkedInAnalysisService;
import com.qualscore.qualcore.service.ReportGenerationService;
import com.qualscore.qualcore.service.TaggingService;
import com.qualscore.qualcore.validation.LinkedInUrlValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiagnosticAnalysisOrchestrationServiceImpl implements DiagnosticAnalysisOrchestrationService {

    private final CandidateProfileRepository candidateProfileRepository;
    private final DiagnosticQuestionResponseRepository questionResponseRepository;
    private final DiagnosticScoreRepository diagnosticScoreRepository;
    private final DiagnosticReportRepository diagnosticReportRepository;
    private final LinkedInAnalysisResultRepository linkedInAnalysisResultRepository;
    private final DiagnosticScoringService scoringService;
    private final FinalScoreCalculator finalScoreCalculator;
    private final TaggingService taggingService;
    private final LinkedInAnalysisService linkedInAnalysisService;
    private final ProfileIngestionService profileIngestionService;
    private final ReportGenerationService reportGenerationService;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public DiagnosticAnalysisResponse analyze(String candidateReference, DiagnosticAnalysisTriggerRequest request) {
        CandidateProfile candidate = candidateProfileRepository.findByCandidateCode(candidateReference)
                .orElseThrow(() -> new BusinessException(
                        "CANDIDATE_NOT_FOUND",
                        "No candidate profile found for reference: " + candidateReference,
                        HttpStatus.NOT_FOUND));

        auditLogService.success(
                AuditEventType.DIAGNOSTIC_ANALYSIS_STARTED,
                candidateReference,
                "DiagnosticAnalysis",
                candidateReference,
                Map.of("forceRecalculate", request.isForceRecalculate()));

        validateLinkedInUrl(candidate, candidateReference);

        if (!request.isForceRecalculate()) {
            Optional<DiagnosticReport> existingReport = diagnosticReportRepository
                    .findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId());
            if (existingReport.isPresent()) {
                auditLogService.skipped(
                        AuditEventType.DIAGNOSTIC_ANALYSIS_STARTED,
                        candidateReference,
                        "DiagnosticAnalysis",
                        candidateReference,
                        Map.of("reason", "ANALYSIS_ALREADY_EXISTS"));
                throw new BusinessException(
                        "ANALYSIS_ALREADY_EXISTS",
                        "A diagnostic report already exists for this candidate. Set forceRecalculate=true to re-run.",
                        HttpStatus.CONFLICT);
            }
        }

        List<DiagnosticQuestionResponse> responses = questionResponseRepository
                .findByCandidateProfileIdOrderByQuestionCode(candidate.getId());

        if (responses.size() < DiagnosticConstants.TOTAL_QUESTIONS) {
            auditLogService.failure(
                    AuditEventType.DIAGNOSTIC_ANALYSIS_FAILED,
                    candidateReference,
                    "DiagnosticAnalysis",
                    candidateReference,
                    Map.of("reason", "INCOMPLETE_RESPONSES", "responseCount", responses.size(),
                            "required", DiagnosticConstants.TOTAL_QUESTIONS));
            throw new BusinessException(
                    "INCOMPLETE_DIAGNOSTIC_RESPONSES",
                    "Candidate has " + responses.size() + " of 15 required responses. Complete the diagnostic before triggering analysis.",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        List<DiagnosticAnswerRequest> answerRequests = responses.stream()
                .map(r -> {
                    DiagnosticAnswerRequest ar = new DiagnosticAnswerRequest();
                    ar.setQuestionCode(r.getQuestionCode());
                    ar.setSelectedOptionCode(r.getSelectedOptionCode());
                    ar.setScore(r.getScore());
                    return ar;
                })
                .toList();

        DiagnosticScoreResult scored = scoringService.score(answerRequests);

        LinkedInAnalysisOutput linkedInAnalysis;
        boolean linkedinAnalyzed = false;
        boolean isMockLinkedIn   = true;

        LinkedInProfileInput liInput = profileIngestionService.build(
                candidate,
                candidate.getLinkedinAboutText(),
                candidate.getLinkedinExperienceText());

        log.info("LinkedIn ingestion mode selected: mode={}, candidateCode={}",
                liInput.getIngestionMode(), candidateReference);

        if (liInput.getIngestionMode().getDefaultConfidence() !=
                com.qualscore.qualcore.enums.LinkedInIngestionMode.AnalysisConfidence.NONE) {
            try {
                linkedInAnalysis = linkedInAnalysisService.analyzeAndPersist(liInput, candidate.getId());
                isMockLinkedIn   = linkedInAnalysis.isMock();
                linkedinAnalyzed = true;
                log.info("LinkedIn analysis completed: candidateCode={}, mode={}, confidence={}, isMock={}",
                        candidateReference, liInput.getIngestionMode(),
                        linkedInAnalysis.getAnalysisConfidence(), isMockLinkedIn);
            } catch (Exception e) {
                log.warn("LinkedIn analysis failed for candidateCode={}: {}", candidateReference, e.getMessage());
                linkedInAnalysis = buildDefaultLinkedInAnalysis();
            }
        } else {
            log.info("No LinkedIn data available for candidateCode={} — using fallback LinkedIn score", candidateReference);
            linkedInAnalysis = buildDefaultLinkedInAnalysis();
        }

        double linkedInScore = linkedInAnalysis.getLinkedinScore();
        double finalScore    = finalScoreCalculator.calculate(scored, linkedInScore);
        ScoreBand band       = finalScoreCalculator.resolveBand(finalScore);
        List<String> tags    = taggingService.generateTags(scored, finalScore);

        DiagnosticScore score = persistScore(candidate, scored, linkedInScore, finalScore, band, tags);

        LinkedInAnalysisResult latestLinkedIn = linkedInAnalysisResultRepository
                .findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId())
                .orElse(null);

        Map<String, Object> reportData = reportGenerationService.generateAndPersist(
                candidate, score, latestLinkedIn);

        auditLogService.success(
                AuditEventType.DIAGNOSTIC_ANALYSIS_COMPLETE,
                candidateReference,
                "DiagnosticAnalysis",
                candidateReference,
                Map.of(
                        "finalScore", finalScore,
                        "band", band.getLabel(),
                        "tagCount", tags.size(),
                        "linkedinAnalyzed", linkedinAnalyzed,
                        "isMockLinkedIn", isMockLinkedIn));

        log.info("Diagnostic analysis complete: candidateCode={}, finalScore={}, band={}, tags={}",
                candidateReference, finalScore, band, tags);

        return DiagnosticAnalysisResponse.builder()
                .candidateCode(candidateReference)
                .careerDirectionScore(scored.getCareerDirectionScore())
                .jobSearchBehaviorScore(scored.getJobSearchBehaviorScore())
                .opportunityReadinessScore(scored.getOpportunityReadinessScore())
                .flexibilityConstraintsScore(scored.getFlexibilityScore())
                .improvementIntentScore(scored.getImprovementIntentScore())
                .linkedinScore(linkedInScore)
                .finalEmployabilityScore(finalScore)
                .bandLabel(band.getLabel())
                .tags(tags)
                .reportSummary(reportData)
                .reportGenerated(true)
                .linkedinAnalyzed(linkedinAnalyzed)
                .isMockLinkedIn(isMockLinkedIn)
                .analyzedAt(OffsetDateTime.now().toString())
                .build();
    }

    @Override
    public DiagnosticAnalysisStatusResponse getAnalysisStatus(String candidateReference) {
        CandidateProfile candidate = candidateProfileRepository.findByCandidateCode(candidateReference)
                .orElseThrow(() -> new BusinessException(
                        "CANDIDATE_NOT_FOUND",
                        "No candidate profile found for reference: " + candidateReference,
                        HttpStatus.NOT_FOUND));

        Optional<DiagnosticScore> scoreOpt = diagnosticScoreRepository.findByCandidateProfileId(candidate.getId());
        Optional<DiagnosticReport> reportOpt = diagnosticReportRepository
                .findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId());

        boolean analysisComplete = scoreOpt.isPresent();
        boolean reportGenerated = reportOpt.isPresent();

        DiagnosticAnalysisStatusResponse.DiagnosticAnalysisStatusResponseBuilder builder =
                DiagnosticAnalysisStatusResponse.builder()
                        .candidateCode(candidateReference)
                        .analysisComplete(analysisComplete)
                        .reportGenerated(reportGenerated);

        if (scoreOpt.isPresent()) {
            DiagnosticScore score = scoreOpt.get();
            builder.bandLabel(score.getBandLabel());
            builder.finalEmployabilityScore(
                    score.getFinalEmployabilityScore() != null
                            ? score.getFinalEmployabilityScore().doubleValue()
                            : null);
            builder.analyzedAt(score.getUpdatedAt() != null
                    ? score.getUpdatedAt().toString()
                    : score.getCreatedAt() != null ? score.getCreatedAt().toString() : null);
        }

        if (reportOpt.isPresent()) {
            builder.reportStatus(reportOpt.get().getReportStatus().name());
        }

        return builder.build();
    }

    /**
     * Guards the analysis pipeline against invalid LinkedIn URLs that may have bypassed
     * front-end validation (e.g., direct API calls, data migration, or manual DB edits).
     *
     * <ul>
     *   <li>Blank URL — acceptable; analysis continues in fallback (no-LinkedIn) mode.</li>
     *   <li>Non-blank and valid — acceptable; normal flow proceeds.</li>
     *   <li>Non-blank and invalid — rejected immediately; a clean 422 is returned to the caller
     *       so they can surface a correction message to the user.</li>
     * </ul>
     *
     * PII-safe: the stored URL value is never written to logs.
     */
    private void validateLinkedInUrl(CandidateProfile candidate, String candidateReference) {
        String url = candidate.getLinkedinUrl();
        if (url == null || url.isBlank()) {
            return;
        }
        if (LinkedInUrlValidator.isValidProfileUrl(url)) {
            return;
        }
        String hint = LinkedInUrlValidator.isWrongLinkedInPath(url)
                ? "The stored URL appears to be a company, job, or non-profile LinkedIn page."
                : "The stored URL does not match the expected LinkedIn personal profile format.";
        log.warn("[LinkedInGuard] Invalid LinkedIn URL detected at analysis stage — blocking. candidateCode={} hint={}",
                candidateReference, hint);
        auditLogService.failure(
                AuditEventType.DIAGNOSTIC_ANALYSIS_FAILED,
                candidateReference,
                "DiagnosticAnalysis",
                candidateReference,
                Map.of("reason", "INVALID_LINKEDIN_URL", "hint", hint));
        throw new BusinessException(
                "INVALID_LINKEDIN_URL",
                "Your LinkedIn profile URL appears invalid. Please update it to continue.",
                HttpStatus.UNPROCESSABLE_ENTITY);
    }

    private DiagnosticScore persistScore(CandidateProfile candidate,
                                          DiagnosticScoreResult scored,
                                          double linkedInScore,
                                          double finalScore,
                                          ScoreBand band,
                                          List<String> tags) {
        String tagsJson;
        try {
            tagsJson = objectMapper.writeValueAsString(tags);
        } catch (JsonProcessingException e) {
            tagsJson = "[]";
        }

        DiagnosticScore diagnosticScore = diagnosticScoreRepository
                .findByCandidateProfileId(candidate.getId())
                .orElse(DiagnosticScore.builder().candidateProfile(candidate).build());

        diagnosticScore.setCareerDirectionScore(bd(scored.getCareerDirectionScore()));
        diagnosticScore.setJobSearchBehaviorScore(bd(scored.getJobSearchBehaviorScore()));
        diagnosticScore.setOpportunityReadinessScore(bd(scored.getOpportunityReadinessScore()));
        diagnosticScore.setFlexibilityConstraintsScore(bd(scored.getFlexibilityScore()));
        diagnosticScore.setImprovementIntentScore(bd(scored.getImprovementIntentScore()));
        diagnosticScore.setLinkedinScore(bd(linkedInScore));
        diagnosticScore.setFinalEmployabilityScore(bd(finalScore));
        diagnosticScore.setBandLabel(band.getLabel());
        diagnosticScore.setTagsJson(tagsJson);

        return diagnosticScoreRepository.save(diagnosticScore);
    }

    private LinkedInAnalysisOutput buildDefaultLinkedInAnalysis() {
        return LinkedInAnalysisOutput.builder()
                .headlineClarity(5).roleClarity(5).profileCompleteness(5)
                .aboutQuality(5).experiencePresentation(5).proofOfWorkVisibility(5)
                .certificationsSignal(5).recommendationSignal(5).activityVisibility(5)
                .careerConsistency(5).growthProgression(5).differentiationStrength(5)
                .recruiterAttractiveness(5)
                .summaryNotes(Collections.emptyList())
                .topStrengths(Collections.emptyList())
                .topConcerns(Collections.emptyList())
                .linkedinScore(5.0)
                .sourceType("DEFAULT")
                .mock(true)
                .build();
    }

    private BigDecimal bd(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP);
    }
}
