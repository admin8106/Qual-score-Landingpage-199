package com.qualscore.qualcore.entity;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosticAnswerEmbed {

    private Integer questionId;
    private String value;
    private Integer score;
    private String category;
}
