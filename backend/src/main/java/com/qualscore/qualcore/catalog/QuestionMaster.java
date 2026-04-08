package com.qualscore.qualcore.catalog;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Getter
@Builder
public class QuestionMaster {
    private String code;
    private int sequence;
    private String sectionCode;
    private String sectionLabel;
    private String text;
    private List<QuestionOption> options;

    public Optional<QuestionOption> findOption(String optionCode) {
        return options.stream()
                .filter(o -> o.getCode().equals(optionCode))
                .findFirst();
    }

    public Map<String, QuestionOption> optionsByCode() {
        return options.stream()
                .collect(Collectors.toMap(QuestionOption::getCode, Function.identity()));
    }
}
