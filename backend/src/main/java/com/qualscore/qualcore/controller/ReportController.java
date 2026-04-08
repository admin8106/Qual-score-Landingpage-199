package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.GenerateReportRequest;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.GenerateReportResponse;
import com.qualscore.qualcore.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/report")
@RequiredArgsConstructor
@Tag(name = "Report", description = "Report generation and retrieval")
public class ReportController {

    private final ReportService reportService;

    @PostMapping("/generate")
    @Operation(summary = "Generate report", description = "Calls LLM to generate a personalized employability report")
    public ResponseEntity<ApiResponse<GenerateReportResponse>> generateReport(
            @Valid @RequestBody GenerateReportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(reportService.generateReport(request)));
    }

    @GetMapping("/{reportId}")
    @Operation(summary = "Get report by ID")
    public ResponseEntity<ApiResponse<GenerateReportResponse>> getReport(@PathVariable UUID reportId) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getReport(reportId)));
    }

    @GetMapping("/session/{sessionId}")
    @Operation(summary = "Get report by session ID")
    public ResponseEntity<ApiResponse<GenerateReportResponse>> getReportBySession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getReportBySessionId(sessionId)));
    }
}
