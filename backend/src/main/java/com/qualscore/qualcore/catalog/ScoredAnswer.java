package com.qualscore.qualcore.catalog;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScoredAnswer {
    private String questionCode;
    private String sectionCode;
    private String selectedOptionCode;
    private String selectedOptionLabel;
    private int backendScore;
}
