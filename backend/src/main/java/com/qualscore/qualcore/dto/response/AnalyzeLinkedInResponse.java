package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.dto.request.LinkedInAnalysisDto;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AnalyzeLinkedInResponse {
    private LinkedInAnalysisDto analysis;
    private boolean isMock;
    private String analyzedAt;
}
