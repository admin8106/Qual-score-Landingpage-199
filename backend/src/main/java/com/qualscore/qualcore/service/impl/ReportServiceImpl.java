package com.qualscore.qualcore.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.client.LlmClient;
import com.qualscore.qualcore.dto.request.GenerateReportRequest;
import com.qualscore.qualcore.dto.response.GenerateReportResponse;
import com.qualscore.qualcore.entity.DiagnosticSession;
import com.qualscore.qualcore.entity.Lead;
import com.qualscore.qualcore.entity.Report;
import com.qualscore.qualcore.exception.ResourceNotFoundException;
import com.qualscore.qualcore.repository.DiagnosticSessionRepository;
import com.qualscore.qualcore.repository.LeadRepository;
import com.qualscore.qualcore.repository.ReportRepository;
import com.qualscore.qualcore.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;
    private final DiagnosticSessionRepository sessionRepository;
    private final LeadRepository leadRepository;
    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public GenerateReportResponse generateReport(GenerateReportRequest request) {
        UUID leadId = UUID.fromString(request.getLeadId());
        UUID sessionId = UUID.fromString(request.getSessionId());

        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId.toString()));
        DiagnosticSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("DiagnosticSession", sessionId.toString()));

        Map<String, Object> reportData = llmClient.generateReport(request);

        String reportDataJson;
        try {
            reportDataJson = objectMapper.writeValueAsString(reportData);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize report data", e);
            reportDataJson = "{}";
        }

        Report report = Report.builder()
                .session(session)
                .lead(lead)
                .reportDataJson(reportDataJson)
                .build();

        report = reportRepository.save(report);
        log.info("Report generated: reportId={}, leadId={}", report.getId(), leadId);

        return GenerateReportResponse.builder()
                .reportId(report.getId().toString())
                .reportData(reportData)
                .generatedAt(report.getCreatedAt().toString())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public GenerateReportResponse getReport(UUID reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", reportId.toString()));
        return toResponse(report);
    }

    @Override
    @Transactional(readOnly = true)
    public GenerateReportResponse getReportBySessionId(UUID sessionId) {
        Report report = reportRepository.findTopBySessionIdOrderByCreatedAtDesc(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "sessionId=" + sessionId));
        return toResponse(report);
    }

    private GenerateReportResponse toResponse(Report report) {
        Map<String, Object> reportData;
        try {
            reportData = objectMapper.readValue(report.getReportDataJson(), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize report data for reportId={}", report.getId(), e);
            reportData = Map.of();
        }
        return GenerateReportResponse.builder()
                .reportId(report.getId().toString())
                .reportData(reportData)
                .generatedAt(report.getCreatedAt().toString())
                .build();
    }
}
