package com.qualscore.qualcore.controller.v1;

import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.DiagnosticReportResponse;
import com.qualscore.qualcore.service.CandidateReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports v1", description = "Diagnostic report retrieval by candidate reference")
public class ReportV1Controller {

    private final CandidateReportService candidateReportService;

    @GetMapping("/{candidateReference}")
    @Operation(summary = "Get diagnostic report",
               description = "Returns the latest generated diagnostic report for the given candidate reference code. Requires that /diagnostic/analyze has been run first.")
    public ResponseEntity<ApiResponse<DiagnosticReportResponse>> getReport(
            @PathVariable String candidateReference) {
        return ResponseEntity.ok(ApiResponse.success(candidateReportService.getReport(candidateReference)));
    }
}
