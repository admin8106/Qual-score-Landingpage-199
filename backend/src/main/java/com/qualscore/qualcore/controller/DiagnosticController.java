package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.CalculateDiagnosticResultRequest;
import com.qualscore.qualcore.dto.request.DiagnosticAnalysisTriggerRequest;
import com.qualscore.qualcore.dto.request.DiagnosticSubmitRequest;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.CalculateDiagnosticResultResponse;
import com.qualscore.qualcore.dto.response.DiagnosticAnalysisResponse;
import com.qualscore.qualcore.dto.response.DiagnosticSubmitResponse;
import com.qualscore.qualcore.dto.response.QuestionMasterResponse;
import com.qualscore.qualcore.service.DiagnosticAnalysisOrchestrationService;
import com.qualscore.qualcore.service.DiagnosticQuestionService;
import com.qualscore.qualcore.service.DiagnosticService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/diagnostic")
@RequiredArgsConstructor
@Tag(name = "Diagnostic", description = "Diagnostic questions, answers, and scoring")
public class DiagnosticController {

    private final DiagnosticService diagnosticService;
    private final DiagnosticQuestionService questionService;
    private final DiagnosticAnalysisOrchestrationService orchestrationService;

    @GetMapping("/questions")
    @Operation(summary = "Get all diagnostic questions",
               description = "Returns all 15 diagnostic questions with their options for frontend rendering. Scores are NOT included — backend assigns scores during submission.")
    public ResponseEntity<ApiResponse<List<QuestionMasterResponse>>> getQuestions() {
        return ResponseEntity.ok(ApiResponse.success(questionService.getAllQuestions()));
    }

    @PostMapping("/submit")
    @Operation(summary = "Submit diagnostic responses",
               description = "Accepts all 15 responses, validates option codes against backend catalog, assigns backend-authoritative scores, and persists results. Frontend-submitted scores are ignored.")
    public ResponseEntity<ApiResponse<DiagnosticSubmitResponse>> submitResponses(
            @Valid @RequestBody DiagnosticSubmitRequest request) {
        return ResponseEntity.ok(ApiResponse.success(diagnosticService.submitResponses(request)));
    }

    @PostMapping("/responses")
    @Operation(summary = "Save all 15 diagnostic responses",
               description = "Validates all 15 responses against the canonical question catalog, assigns backend-authoritative scores, and persists. Accepts the same payload as /submit. Frontend-submitted score values are ignored.")
    public ResponseEntity<ApiResponse<DiagnosticSubmitResponse>> saveResponses(
            @Valid @RequestBody DiagnosticSubmitRequest request) {
        return ResponseEntity.ok(ApiResponse.success(diagnosticService.submitResponses(request)));
    }

    @PostMapping("/analyze/{candidateReference}")
    @Operation(summary = "Run full diagnostic analysis",
               description = "Orchestrates the complete analysis pipeline: fetches responses, scores via canonical catalog, runs LinkedIn analysis, computes final weighted score, generates tags, and persists diagnostic score and report. By default rejects re-runs unless forceRecalculate=true.")
    public ResponseEntity<ApiResponse<DiagnosticAnalysisResponse>> analyze(
            @PathVariable String candidateReference,
            @Valid @RequestBody DiagnosticAnalysisTriggerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(orchestrationService.analyze(candidateReference, request)));
    }

    @PostMapping("/calculate")
    @Operation(summary = "Calculate diagnostic result (legacy)", description = "Runs the scoring engine and computes the final employability score")
    public ResponseEntity<ApiResponse<CalculateDiagnosticResultResponse>> calculateResult(
            @Valid @RequestBody CalculateDiagnosticResultRequest request) {
        return ResponseEntity.ok(ApiResponse.success(diagnosticService.calculateResult(request)));
    }
}
