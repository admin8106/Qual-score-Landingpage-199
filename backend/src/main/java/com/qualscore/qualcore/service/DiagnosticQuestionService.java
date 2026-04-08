package com.qualscore.qualcore.service;

import com.qualscore.qualcore.catalog.DiagnosticCatalog;
import com.qualscore.qualcore.catalog.QuestionMaster;
import com.qualscore.qualcore.catalog.QuestionOption;
import com.qualscore.qualcore.dto.request.DiagnosticAnswerRequest;
import com.qualscore.qualcore.dto.response.QuestionMasterResponse;
import com.qualscore.qualcore.dto.response.QuestionOptionResponse;
import com.qualscore.qualcore.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DiagnosticQuestionService {

    private final DiagnosticCatalog catalog;

    public List<QuestionMasterResponse> getAllQuestions() {
        return catalog.getAllQuestions().stream()
                .map(this::toResponse)
                .toList();
    }

    public void validateSubmission(List<DiagnosticAnswerRequest> answers) {
        List<String> errors = new ArrayList<>();

        Set<String> seenCodes = new LinkedHashSet<>();
        for (DiagnosticAnswerRequest answer : answers) {
            String qCode = answer.getQuestionCode();

            if (!seenCodes.add(qCode)) {
                errors.add("Duplicate response for question: " + qCode);
                continue;
            }

            QuestionMaster question = catalog.findByCode(qCode)
                    .orElse(null);
            if (question == null) {
                errors.add("Unknown question code: " + qCode);
                continue;
            }

            boolean validOption = question.findOption(answer.getSelectedOptionCode()).isPresent();
            if (!validOption) {
                errors.add("Invalid option '" + answer.getSelectedOptionCode()
                        + "' for question " + qCode
                        + ". Valid options: " + question.optionsByCode().keySet());
            }
        }

        if (!errors.isEmpty()) {
            throw new BusinessException(
                    "INVALID_DIAGNOSTIC_SUBMISSION",
                    "Submission contains invalid responses: " + String.join("; ", errors),
                    HttpStatus.UNPROCESSABLE_ENTITY
            );
        }
    }

    public int resolveScore(String questionCode, String optionCode) {
        QuestionMaster question = catalog.findByCode(questionCode)
                .orElseThrow(() -> new BusinessException(
                        "UNKNOWN_QUESTION", "Question not found: " + questionCode, HttpStatus.BAD_REQUEST));

        QuestionOption option = question.findOption(optionCode)
                .orElseThrow(() -> new BusinessException(
                        "UNKNOWN_OPTION",
                        "Option '" + optionCode + "' is not valid for question " + questionCode,
                        HttpStatus.BAD_REQUEST));

        return option.getScore();
    }

    public String resolveSection(String questionCode) {
        return catalog.findByCode(questionCode)
                .map(QuestionMaster::getSectionCode)
                .orElseThrow(() -> new BusinessException(
                        "UNKNOWN_QUESTION", "Question not found: " + questionCode, HttpStatus.BAD_REQUEST));
    }

    public String resolveOptionLabel(String questionCode, String optionCode) {
        return catalog.findByCode(questionCode)
                .flatMap(q -> q.findOption(optionCode))
                .map(QuestionOption::getLabel)
                .orElse(optionCode);
    }

    private QuestionMasterResponse toResponse(QuestionMaster q) {
        List<QuestionOptionResponse> optionResponses = q.getOptions().stream()
                .map(o -> QuestionOptionResponse.builder()
                        .code(o.getCode())
                        .label(o.getLabel())
                        .build())
                .toList();

        return QuestionMasterResponse.builder()
                .code(q.getCode())
                .sequence(q.getSequence())
                .sectionCode(q.getSectionCode())
                .sectionLabel(q.getSectionLabel())
                .text(q.getText())
                .options(optionResponses)
                .build();
    }
}
