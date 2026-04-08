package com.qualscore.qualcore.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.config.OpenAiConfig;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.LinkedInAnalysisResult;
import com.qualscore.qualcore.enums.CareerStage;
import com.qualscore.qualcore.enums.ReportStatus;
import com.qualscore.qualcore.monitoring.MonitoringService;
import com.qualscore.qualcore.openai.AiJsonParser;
import com.qualscore.qualcore.openai.OpenAiClient;
import com.qualscore.qualcore.openai.PromptTemplateService;
import com.qualscore.qualcore.openai.ReportOutputValidator;
import com.qualscore.qualcore.openai.dto.AiCallResult;
import com.qualscore.qualcore.openai.dto.ChatMessage;
import com.qualscore.qualcore.repository.DiagnosticReportRepository;
import com.qualscore.qualcore.service.impl.ReportGenerationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportGenerationService")
class ReportGenerationServiceTest {

    @Mock
    private OpenAiClient openAiClient;

    @Mock
    private PromptTemplateService promptTemplateService;

    @Mock
    private AiJsonParser aiJsonParser;

    @Mock
    private ReportOutputValidator reportOutputValidator;

    @Mock
    private DiagnosticReportRepository diagnosticReportRepository;

    @Mock
    private MonitoringService monitoringService;

    private OpenAiConfig openAiConfig;
    private ObjectMapper objectMapper;

    private ReportGenerationService reportGenerationService;

    @BeforeEach
    void setUp() {
        openAiConfig = new OpenAiConfig();
        objectMapper = new ObjectMapper();
        reportGenerationService = new ReportGenerationServiceImpl(
            openAiClient, openAiConfig, promptTemplateService, aiJsonParser,
            reportOutputValidator, diagnosticReportRepository, monitoringService, objectMapper
        );

        when(diagnosticReportRepository.findTopByCandidateProfileIdOrderByCreatedAtDesc(any()))
            .thenReturn(Optional.empty());
        when(diagnosticReportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Nested
    @DisplayName("When AI is not configured")
    class AiNotConfigured {

        @BeforeEach
        void setAiNotConfigured() {
            openAiConfig.setApiKey("");
        }

        @Test
        @DisplayName("falls back to rule-based report")
        void aiNotConfigured_fallsBackToRuleBasedReport() {
            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            assertThat(result).containsKeys(
                "reportTitle", "scoreSummary", "linkedinInsight",
                "behavioralInsight", "dimensionBreakdown", "topGaps",
                "riskProjection", "recommendation", "recruiterViewInsight", "ctaBlock"
            );
        }

        @Test
        @DisplayName("rule-based report always includes reportTitle")
        void ruleBasedReport_alwaysIncludesReportTitle() {
            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "CRITICAL"),
                score(3.0, "CRITICAL"),
                null
            );

            assertThat(result.get("reportTitle")).asString().isNotBlank();
        }

        @Test
        @DisplayName("CRITICAL band includes urgency language in reportTitle")
        void criticalBand_includesUrgencyInTitle() {
            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "CRITICAL"),
                score(3.0, "CRITICAL"),
                null
            );

            assertThat(result.get("reportTitle")).asString()
                .containsIgnoringCase("risk")
                .or().containsIgnoringCase("critical")
                .or().containsIgnoringCase("alert");
        }

        @Test
        @DisplayName("dimensionBreakdown always returns 6 dimensions")
        void ruleBasedReport_alwaysReturnsSixDimensions() {
            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> breakdown = (List<Map<String, Object>>) result.get("dimensionBreakdown");
            assertThat(breakdown).hasSize(6);
        }

        @Test
        @DisplayName("topGaps always returns 3 entries")
        void ruleBasedReport_alwaysReturnsThreeTopGaps() {
            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            @SuppressWarnings("unchecked")
            List<String> topGaps = (List<String>) result.get("topGaps");
            assertThat(topGaps).hasSize(3);
        }

        @Test
        @DisplayName("does not call openAiClient when AI not configured")
        void noAiConfigured_doesNotCallOpenAiClient() {
            reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            verifyNoInteractions(openAiClient);
        }

        @Test
        @DisplayName("persists report even without AI")
        void noAiConfigured_persistsReport() {
            reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            verify(diagnosticReportRepository).save(any());
        }

        @Test
        @DisplayName("linkedin signal is included when LinkedInAnalysisResult provided")
        void withLinkedinResult_linkedinInsightReflectsScores() {
            LinkedInAnalysisResult liResult = linkedInResult(8, 9);

            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "STRONG"),
                score(8.0, "STRONG"),
                liResult
            );

            assertThat(result.get("linkedinInsight")).asString().isNotBlank();
        }
    }

    @Nested
    @DisplayName("When AI is configured")
    class AiConfigured {

        @BeforeEach
        void setAiConfigured() {
            openAiConfig.setApiKey("sk-test-key-1234567890abcdef");
            openAiConfig.setModel("gpt-4o");
            openAiConfig.setMaxTokens(2000);
            openAiConfig.setTemperature(0.2);
            openAiConfig.setTimeoutSeconds(60);
            openAiConfig.setMaxRetries(1);
            when(promptTemplateService.buildReportGenerationPrompt(any()))
                .thenReturn(List.of(ChatMessage.builder().role("user").content("test").build()));
        }

        @Test
        @DisplayName("uses AI report when AI call succeeds")
        void aiCallSucceeds_returnsAiGeneratedReport() {
            Map<String, Object> aiContent = validAiReportContent();
            AiCallResult successResult = AiCallResult.builder()
                .success(true).rawContent("{...}").build();

            when(openAiClient.complete(any(), anyInt())).thenReturn(successResult);
            when(aiJsonParser.parseToMap(any(), anyList())).thenReturn(Optional.of(aiContent));
            when(reportOutputValidator.validate(any())).thenReturn(ReportOutputValidator.ValidationResult.success());
            when(aiJsonParser.toJson(any())).thenReturn("{}");

            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            assertThat(result).containsKey("reportTitle");
            assertThat(result.get("reportTitle")).isEqualTo("AI Generated Report Title");
        }

        @Test
        @DisplayName("falls back to rule-based when AI call fails")
        void aiCallFails_fallsBackToRuleBasedReport() {
            AiCallResult failResult = AiCallResult.builder()
                .success(false).errorMessage("HTTP 500: Server error").build();

            when(openAiClient.complete(any(), anyInt())).thenReturn(failResult);

            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            assertThat(result).containsKeys("reportTitle", "scoreSummary", "dimensionBreakdown");
        }

        @Test
        @DisplayName("falls back to rule-based when AI JSON validation fails")
        void aiJsonValidationFails_fallsBackToRuleBasedReport() {
            AiCallResult successResult = AiCallResult.builder()
                .success(true).rawContent("{\"reportTitle\": \"Only Title\"}").build();

            when(openAiClient.complete(any(), anyInt())).thenReturn(successResult);
            when(aiJsonParser.parseToMap(any(), anyList())).thenReturn(Optional.empty());

            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            assertThat(result).containsKeys("reportTitle", "scoreSummary", "dimensionBreakdown");
        }

        @Test
        @DisplayName("retries once on first AI failure")
        void firstAiAttemptFails_retriesOnce() {
            AiCallResult failResult = AiCallResult.builder()
                .success(false).errorMessage("Transient error").build();

            when(openAiClient.complete(any(), anyInt())).thenReturn(failResult);

            reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            verify(openAiClient, times(2)).complete(any(), anyInt());
        }

        @Test
        @DisplayName("does not retry after auth error")
        void authError_doesNotRetry() {
            AiCallResult authFailResult = AiCallResult.builder()
                .success(false).errorMessage("HTTP 401: Unauthorized").build();

            when(openAiClient.complete(any(), anyInt())).thenReturn(authFailResult);

            reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            verify(openAiClient, times(1)).complete(any(), anyInt());
        }

        @Test
        @DisplayName("persists rawAiResponse when AI succeeds")
        void aiSucceeds_persistsRawAiResponse() {
            Map<String, Object> aiContent = validAiReportContent();
            AiCallResult successResult = AiCallResult.builder()
                .success(true).rawContent("{\"raw\": \"ai response\"}").build();

            when(openAiClient.complete(any(), anyInt())).thenReturn(successResult);
            when(aiJsonParser.parseToMap(any(), anyList())).thenReturn(Optional.of(aiContent));
            when(reportOutputValidator.validate(any())).thenReturn(ReportOutputValidator.ValidationResult.success());
            when(aiJsonParser.toJson(any())).thenReturn("{}");

            reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            ArgumentCaptor<com.qualscore.qualcore.entity.DiagnosticReport> captor =
                ArgumentCaptor.forClass(com.qualscore.qualcore.entity.DiagnosticReport.class);
            verify(diagnosticReportRepository).save(captor.capture());
            assertThat(captor.getValue().getRawAiResponse()).isNotNull();
        }
    }

    @Nested
    @DisplayName("Fallback report quality")
    class FallbackReportQuality {

        @BeforeEach
        void setAiNotConfigured() {
            openAiConfig.setApiKey("");
        }

        @Test
        @DisplayName("STRONG band CTA uses precision language")
        void strongBand_ctaUsesPrecisionLanguage() {
            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "STRONG"),
                score(8.5, "STRONG"),
                null
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> ctaBlock = (Map<String, Object>) result.get("ctaBlock");
            assertThat(ctaBlock).isNotNull();
            assertThat(ctaBlock.get("headline")).asString().isNotBlank();
            assertThat(ctaBlock.get("buttonText")).asString().isNotBlank();
        }

        @Test
        @DisplayName("all dimension breakdown entries have required fields")
        void dimensionBreakdown_allEntriesHaveRequiredFields() {
            Map<String, Object> result = reportGenerationService.generateAndPersist(
                candidate("CND-TEST1", "NEEDS_OPTIMIZATION"),
                score(6.0, "NEEDS_OPTIMIZATION"),
                null
            );

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> breakdown = (List<Map<String, Object>>) result.get("dimensionBreakdown");
            breakdown.forEach(dim -> {
                assertThat(dim).containsKeys("area", "score", "status", "remark");
                assertThat(dim.get("area")).asString().isNotBlank();
                assertThat(dim.get("status")).asString().isNotBlank();
            });
        }
    }

    private CandidateProfile candidate(String candidateCode, String band) {
        CandidateProfile cp = new CandidateProfile();
        cp.setId(UUID.randomUUID());
        cp.setCandidateCode(candidateCode);
        cp.setFullName("Test User");
        cp.setEmail("test@example.com");
        cp.setCareerStage(CareerStage.WORKING_PROFESSIONAL);
        cp.setIndustry("Technology");
        cp.setCurrentRole("Software Engineer");
        return cp;
    }

    private DiagnosticScore score(double finalScore, String bandLabel) {
        return DiagnosticScore.builder()
            .id(UUID.randomUUID())
            .finalEmployabilityScore(BigDecimal.valueOf(finalScore))
            .bandLabel(bandLabel)
            .careerDirectionScore(BigDecimal.valueOf(finalScore))
            .jobSearchBehaviorScore(BigDecimal.valueOf(finalScore))
            .opportunityReadinessScore(BigDecimal.valueOf(finalScore))
            .flexibilityConstraintsScore(BigDecimal.valueOf(finalScore))
            .improvementIntentScore(BigDecimal.valueOf(finalScore))
            .linkedinScore(BigDecimal.valueOf(finalScore))
            .tagsJson("[]")
            .build();
    }

    private LinkedInAnalysisResult linkedInResult(int headlineClarity, int recruiterAttractiveness) {
        LinkedInAnalysisResult li = new LinkedInAnalysisResult();
        li.setHeadlineClarity(headlineClarity);
        li.setRecruiterAttractiveness(recruiterAttractiveness);
        li.setProfileCompleteness(8);
        li.setProofOfWorkVisibility(7);
        return li;
    }

    private Map<String, Object> validAiReportContent() {
        return Map.of(
            "reportTitle",          "AI Generated Report Title",
            "scoreSummary",         Map.of("employabilityScore", 6.0, "bandLabel", "NEEDS_OPTIMIZATION", "tagline", "Keep improving"),
            "linkedinInsight",      "LinkedIn insight text",
            "behavioralInsight",    "Behavioral insight text",
            "dimensionBreakdown",   List.of(),
            "topGaps",              List.of("Gap 1", "Gap 2", "Gap 3"),
            "riskProjection",       "Risk projection text",
            "recommendation",       "Recommendation text",
            "recruiterViewInsight", "Recruiter view text",
            "ctaBlock",             Map.of("headline", "CTA Headline", "body", "CTA Body", "buttonText", "Book Now")
        );
    }
}
