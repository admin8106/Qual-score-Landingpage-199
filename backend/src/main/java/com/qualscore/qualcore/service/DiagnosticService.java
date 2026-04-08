package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.CalculateDiagnosticResultRequest;
import com.qualscore.qualcore.dto.request.DiagnosticSubmitRequest;
import com.qualscore.qualcore.dto.request.SaveDiagnosticResponsesRequest;
import com.qualscore.qualcore.dto.response.CalculateDiagnosticResultResponse;
import com.qualscore.qualcore.dto.response.DiagnosticSubmitResponse;
import com.qualscore.qualcore.dto.response.SaveDiagnosticResponsesResponse;

public interface DiagnosticService {

    DiagnosticSubmitResponse submitResponses(DiagnosticSubmitRequest request);

    SaveDiagnosticResponsesResponse saveResponses(SaveDiagnosticResponsesRequest request);

    CalculateDiagnosticResultResponse calculateResult(CalculateDiagnosticResultRequest request);
}
