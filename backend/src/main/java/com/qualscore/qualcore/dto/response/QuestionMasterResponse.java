package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class QuestionMasterResponse {
    private String code;
    private int sequence;
    private String sectionCode;
    private String sectionLabel;
    private String text;
    private List<QuestionOptionResponse> options;
}
