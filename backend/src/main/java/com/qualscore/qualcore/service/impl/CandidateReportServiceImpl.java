package com.qualscore.qualcore.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.dto.response.DiagnosticReportResponse;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.repository.CandidateProfileRepository;
import com.qualscore.qualcore.repository.DiagnosticReportRepository;
import com.qualscore.qualcore.service.CandidateReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CandidateReportServiceImpl implements CandidateReportService {

    private final CandidateProfileRepository candidateProfileRepository;
    private final DiagnosticReportRepository diagnosticReportRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public DiagnosticReportResponse getReport(String candidateReference) {
        CandidateProfile candidate = candidateProfileRepository.findByCandidateCode(candidateReference)
                .orElseThrow(() -> new BusinessException(
                        "CANDIDATE_NOT_FOUND",
                        "No candidate profile found for reference: " + candidateReference,
                        HttpStatus.NOT_FOUND));

        DiagnosticReport report = diagnosticReportRepository
                .findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId())
                .orElseThrow(() -> new BusinessException(
                        "REPORT_NOT_FOUND",
                        "No diagnostic report found for candidate: " + candidateReference + ". Run /analyze first.",
                        HttpStatus.NOT_FOUND));

        return toResponse(report, candidateReference);
    }

    private DiagnosticReportResponse toResponse(DiagnosticReport report, String candidateCode) {
        Object scoreSummary = deserialize(report.getScoreSummaryJson());
        Object dimensionBreakdown = deserialize(report.getDimensionBreakdownJson());
        Object topGaps = deserialize(report.getTopGapsJson());

        return DiagnosticReportResponse.builder()
                .id(report.getId())
                .candidateCode(candidateCode)
                .reportTitle(report.getReportTitle())
                .scoreSummary(scoreSummary)
                .tagline(report.getTagline())
                .linkedinInsight(report.getLinkedinInsight())
                .behavioralInsight(report.getBehavioralInsight())
                .dimensionBreakdown(dimensionBreakdown)
                .topGaps(topGaps)
                .riskProjection(report.getRiskProjection())
                .recommendation(report.getRecommendation())
                .recruiterViewInsight(report.getRecruiterViewInsight())
                .ctaHeadline(report.getCtaHeadline())
                .ctaBody(report.getCtaBody())
                .ctaButtonText(report.getCtaButtonText())
                .reportStatus(report.getReportStatus())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }

    private Object deserialize(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Object>() {});
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize JSON field: {}", e.getMessage());
            return null;
        }
    }
}
