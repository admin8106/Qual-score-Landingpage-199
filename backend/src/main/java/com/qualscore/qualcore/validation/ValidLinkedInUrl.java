package com.qualscore.qualcore.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = LinkedInUrlValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidLinkedInUrl {
    String message() default "Please provide a valid LinkedIn profile URL.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
