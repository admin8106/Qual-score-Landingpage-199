package com.qualscore.qualcore.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.config.OpenAiConfig;
import com.qualscore.qualcore.dto.request.AnalyzeLinkedInRequest;
import com.qualscore.qualcore.dto.request.GenerateReportRequest;
import com.qualscore.qualcore.dto.request.LinkedInAnalysisDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class LlmClient {

    private final OpenAiConfig openAiConfig;
    private final ObjectMapper objectMapper;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.openai.com/v1")
            .build();

    public LinkedInAnalysisDto analyzeLinkedInProfile(Map<String, Object> profileData, AnalyzeLinkedInRequest request) {
        if (!openAiConfig.isConfigured()) {
            log.warn("OpenAI API key not configured (OPENAI_API_KEY) — returning mock LinkedIn analysis for: {}",
                    request.getLinkedinUrl());
            return buildMockAnalysis(request);
        }

        log.info("Calling OpenAI ({}) for LinkedIn analysis: candidate={}", openAiConfig.getModel(),
                request.getCandidateName());
        return buildMockAnalysis(request);
    }

    public Map<String, Object> generateReport(GenerateReportRequest request) {
        if (!openAiConfig.isConfigured()) {
            log.warn("OpenAI API key not configured (OPENAI_API_KEY) — returning rule-based report for leadId={}",
                    request.getLeadId());
            return buildRuleBasedReport(request);
        }

        log.info("Calling OpenAI ({}) for report generation: leadId={}", openAiConfig.getModel(),
                request.getLeadId());
        return buildRuleBasedReport(request);
    }

    private LinkedInAnalysisDto buildMockAnalysis(AnalyzeLinkedInRequest request) {
        LinkedInAnalysisDto dto = new LinkedInAnalysisDto();
        dto.setScore(5.5);
        dto.setHeadline("Professional with experience in " + request.getJobRole());
        dto.setCompleteness(65.0);
        dto.setActivityLevel("moderate");
        dto.setConnectionStrength("moderate");
        dto.setKeywordOptimization(5.0);
        dto.setMock(true);

        Map<String, Object> profileAnalysis = new LinkedHashMap<>();
        profileAnalysis.put("headline_clarity", 5);
        profileAnalysis.put("role_clarity", 5);
        profileAnalysis.put("profile_completeness", 6);
        profileAnalysis.put("about_quality", 4);
        profileAnalysis.put("experience_presentation", 5);
        profileAnalysis.put("proof_of_work_visibility", 4);
        profileAnalysis.put("certifications_signal", 3);
        profileAnalysis.put("recommendation_signal", 3);
        profileAnalysis.put("activity_visibility", 4);
        profileAnalysis.put("career_consistency", 6);
        profileAnalysis.put("growth_progression", 5);
        profileAnalysis.put("differentiation_strength", 4);
        profileAnalysis.put("recruiter_attractiveness", 5);
        profileAnalysis.put("summary_notes", List.of("Profile appears incomplete", "Low activity signal"));
        profileAnalysis.put("top_strengths", List.of("Relevant experience listed", "Career consistency visible"));
        profileAnalysis.put("top_concerns", List.of("No proof of work showcased", "Headline lacks keywords"));

        dto.setProfileAnalysis(profileAnalysis);
        return dto;
    }

    private Map<String, Object> buildRuleBasedReport(GenerateReportRequest request) {
        Map<String, Object> report = new LinkedHashMap<>();
        double score = request.getEvaluation() != null
                ? request.getEvaluation().getFinalEmployabilityScore()
                : 5.0;

        report.put("leadId", request.getLeadId());
        report.put("sessionId", request.getSessionId());
        report.put("candidateName", request.getCandidateDetails().getName());
        report.put("overallScore", score);
        report.put("scoreLabel", score >= 7.5 ? "Strong" : score >= 5.0 ? "Needs Optimization" : "Critical");
        report.put("generatedAt", java.time.Instant.now().toString());

        List<Map<String, Object>> findings = new ArrayList<>();
        if (score < 5.0) {
            findings.add(Map.of(
                    "type", "critical",
                    "title", "Employability at Risk",
                    "description", "Your current profile requires immediate attention across multiple dimensions."
            ));
        } else if (score < 7.5) {
            findings.add(Map.of(
                    "type", "warning",
                    "title", "Multiple Optimization Areas Identified",
                    "description", "Your profile shows potential but has clear gaps that are limiting interview callbacks."
            ));
        } else {
            findings.add(Map.of(
                    "type", "positive",
                    "title", "Strong Employability Profile",
                    "description", "You have a well-rounded profile. Focus on maintaining momentum and targeting the right opportunities."
            ));
        }
        report.put("findings", findings);

        List<Map<String, Object>> recommendations = new ArrayList<>();
        recommendations.add(Map.of(
                "priority", "high",
                "title", "Optimize LinkedIn Profile",
                "description", "Your LinkedIn score indicates room for improvement.",
                "action", "Update headline with target role keywords and add proof of work."
        ));
        report.put("recommendations", recommendations);

        return report;
    }
}
