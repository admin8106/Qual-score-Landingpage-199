package com.qualscore.qualcore.validation;

import com.qualscore.qualcore.constants.DiagnosticConstants;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class QuestionCodeValidator implements ConstraintValidator<ValidQuestionCode, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) return false;
        return DiagnosticConstants.VALID_QUESTION_CODES.contains(value.trim().toUpperCase());
    }
}
