package com.qualscore.qualcore.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class MobileNumberValidator implements ConstraintValidator<ValidMobileNumber, String> {

    private static final Pattern E164_PATTERN = Pattern.compile("^\\+[1-9]\\d{6,14}$");
    private static final Pattern INDIA_LOCAL_PATTERN = Pattern.compile("^[6-9]\\d{9}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) return false;
        String trimmed = value.trim();
        return E164_PATTERN.matcher(trimmed).matches() || INDIA_LOCAL_PATTERN.matcher(trimmed).matches();
    }
}
