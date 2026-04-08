package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class DiagnosticAnswerResponse {

    private UUID id;
    private String questionCode;
    private String sectionCode;
    private String selectedOptionCode;
    private Integer score;
}
