package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.DiagnosticAnalysisTriggerRequest;
import com.qualscore.qualcore.dto.response.DiagnosticAnalysisResponse;

public interface DiagnosticAnalysisOrchestrationService {

    DiagnosticAnalysisResponse analyze(String candidateReference, DiagnosticAnalysisTriggerRequest request);
}
