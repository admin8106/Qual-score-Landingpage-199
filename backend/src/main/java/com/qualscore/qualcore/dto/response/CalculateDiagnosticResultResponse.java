package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.dto.request.FinalScoreDto;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CalculateDiagnosticResultResponse {
    private FinalScoreDto evaluation;
    private String computedAt;
}
