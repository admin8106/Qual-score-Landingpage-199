package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.response.DiagnosticReportResponse;

public interface CandidateReportService {

    DiagnosticReportResponse getReport(String candidateReference);
}
