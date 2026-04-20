package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DiagnosticSubmitResponse {

    private String candidateCode;
    private int answersRecorded;
    private List<DiagnosticAnswerResponse> answers;
    private String message;
}
