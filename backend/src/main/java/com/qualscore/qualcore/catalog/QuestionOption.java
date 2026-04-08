package com.qualscore.qualcore.catalog;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuestionOption {
    private String code;
    private String label;
    private int score;
}
