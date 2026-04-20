package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.DiagnosticAnalysisTriggerRequest;
import com.qualscore.qualcore.dto.response.DiagnosticAnalysisResponse;
import com.qualscore.qualcore.dto.response.DiagnosticAnalysisStatusResponse;

public interface DiagnosticAnalysisOrchestrationService {

    DiagnosticAnalysisResponse analyze(String candidateReference, DiagnosticAnalysisTriggerRequest request);

    DiagnosticAnalysisStatusResponse getAnalysisStatus(String candidateReference);
}
