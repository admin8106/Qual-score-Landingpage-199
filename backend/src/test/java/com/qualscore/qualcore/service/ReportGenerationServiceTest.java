package com.qualscore.qualcore.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.config.OpenAiConfig;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.LinkedInAnalysisResult;
import com.qualscore.qualcore.enums.CareerStage;
import com.qualscore.qualcore.monitoring.MonitoringService;
import com.qualscore.qualcore.openai.*;
import com.qualscore.qualcore.openai.dto.AiCallResult;
import com.qualscore.qualcore.openai.dto.ChatMessage;
import com.qualscore.qualcore.repository.DiagnosticReportRepository;
import com.qualscore.qualcore.service.impl.ReportGenerationServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportGenerationService")
class ReportGenerationServiceTest {

    @Mock
    private DynamicAiClient dynamicAiClient;   // ✅ FIX ADDED

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
                dynamicAiClient,
                openAiClient,
                openAiConfig,
                promptTemplateService,
                aiJsonParser,
                reportOutputValidator,
                diagnosticReportRepository,
                monitoringService,
                objectMapper
        );

        when(diagnosticReportRepository.findTopByCandidateProfileIdOrderByCreatedAtDesc(any()))
                .thenReturn(Optional.empty());

        when(diagnosticReportRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Nested
    class AiNotConfigured {

        @BeforeEach
        void setAiNotConfigured() {
            openAiConfig.setApiKey("");
        }

        @Test
        void criticalBand_includesUrgencyInTitle() {
            Map<String, Object> result = reportGenerationService.generateAndPersist(
                    candidate("CND-TEST1"),
                    score(3.0, "CRITICAL"),
                    null
            );

            String title = result.get("reportTitle").toString().toLowerCase();

            assertThat(
                    title.contains("risk") ||
                            title.contains("critical") ||
                            title.contains("alert")
            ).isTrue();
        }
    }

    @Nested
    class AiConfigured {

        @BeforeEach
        void setAiConfigured() {
            openAiConfig.setApiKey("sk-test");
            openAiConfig.setModel("gpt-4o");
            openAiConfig.setMaxTokens(2000);
            openAiConfig.setTemperature(0.2);
            openAiConfig.setTimeoutSeconds(60);
            openAiConfig.setMaxRetries(1);

            when(promptTemplateService.buildReportGenerationPrompt(any()))
                    .thenReturn(List.of(ChatMessage.builder()
                            .role("user")
                            .content("test")
                            .build()));
        }

        @Test
        void aiCallFails_fallsBackToRuleBasedReport() {
            AiCallResult failResult = AiCallResult.builder()
                    .success(false)
                    .errorMessage("Server error")
                    .build();

            when(openAiClient.complete(any(), anyInt()))
                    .thenReturn(failResult);

            Map<String, Object> result = reportGenerationService.generateAndPersist(
                    candidate("CND-TEST1"),
                    score(6.0, "NEEDS_OPTIMIZATION"),
                    null
            );

            assertThat(result).containsKeys("reportTitle", "scoreSummary");
        }

        @Test
        void aiSucceeds_persistsResult() {
            Map<String, Object> aiContent = validAi();

            AiCallResult success = AiCallResult.builder()
                    .success(true)
                    .rawContent("{}")
                    .build();

            when(openAiClient.complete(any(), anyInt())).thenReturn(success);
            when(aiJsonParser.parseToMap(any(), anyList())).thenReturn(Optional.of(aiContent));
            when(reportOutputValidator.validate(any()))
                    .thenReturn(ReportOutputValidator.ValidationResult.success());
            when(aiJsonParser.toJson(any())).thenReturn("{}");

            reportGenerationService.generateAndPersist(
                    candidate("CND-TEST1"),
                    score(6.0, "NEEDS_OPTIMIZATION"),
                    null
            );

            verify(diagnosticReportRepository).save(any());
        }
    }

    // ---------------- helpers ----------------

    private CandidateProfile candidate(String code) {
        CandidateProfile c = new CandidateProfile();
        c.setId(UUID.randomUUID());
        c.setCandidateCode(code);
        c.setFullName("Test User");
        c.setEmail("test@example.com");
        c.setCareerStage(CareerStage.WORKING_PROFESSIONAL);
        return c;
    }

    private DiagnosticScore score(double val, String band) {
        return DiagnosticScore.builder()
                .id(UUID.randomUUID())
                .finalEmployabilityScore(BigDecimal.valueOf(val))
                .bandLabel(band)
                .careerDirectionScore(BigDecimal.valueOf(val))
                .jobSearchBehaviorScore(BigDecimal.valueOf(val))
                .opportunityReadinessScore(BigDecimal.valueOf(val))
                .flexibilityConstraintsScore(BigDecimal.valueOf(val))
                .improvementIntentScore(BigDecimal.valueOf(val))
                .linkedinScore(BigDecimal.valueOf(val))
                .tagsJson("[]")
                .build();
    }

    private Map<String, Object> validAi() {
        return Map.of(
                "reportTitle", "AI Generated Report",
                "scoreSummary", Map.of(),
                "dimensionBreakdown", List.of()
        );
    }
}
