package com.qualscore.qualcore.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = MobileNumberValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidMobileNumber {
    String message() default "Mobile number must be a valid E.164 or Indian format (e.g. +919876543210)";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
