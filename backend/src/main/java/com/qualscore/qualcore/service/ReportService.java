package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.GenerateReportRequest;
import com.qualscore.qualcore.dto.response.GenerateReportResponse;

import java.util.UUID;

public interface ReportService {

    GenerateReportResponse generateReport(GenerateReportRequest request);

    GenerateReportResponse getReport(UUID reportId);

    GenerateReportResponse getReportBySessionId(UUID sessionId);
}
