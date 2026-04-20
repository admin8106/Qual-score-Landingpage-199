package com.qualscore.qualcore.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class LinkedInUrlValidator implements ConstraintValidator<ValidLinkedInUrl, String> {

    private static final Pattern LINKEDIN_PROFILE_PATTERN = Pattern.compile(
            "^(?:https?://)?(?:www\\.)?linkedin\\.com/in/([\\w\\-]{3,100})(?:[/?#].*)?$",
            Pattern.CASE_INSENSITIVE
    );

    private static final List<String> REJECTED_PATH_PREFIXES = List.of(
            "/company/",
            "/school/",
            "/jobs/",
            "/job/",
            "/feed/",
            "/posts/",
            "/pulse/",
            "/learning/",
            "/events/",
            "/groups/",
            "/search/",
            "/mynetwork/",
            "/messaging/",
            "/notifications/",
            "/pub/"
    );

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return isValidProfileUrl(value);
    }

    /**
     * Static guard callable from service layer without instantiation.
     * Returns false for blank/null (treat as absent, not invalid).
     * Returns false if the URL is present but not a valid personal /in/ profile.
     */
    public static boolean isValidProfileUrl(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        String trimmed = value.strip();

        String withoutOrigin = trimmed.replaceAll("(?i)^(?:https?://)?(?:www\\.)?linkedin\\.com", "");
        String pathLower = withoutOrigin.toLowerCase();
        for (String rejected : REJECTED_PATH_PREFIXES) {
            if (pathLower.startsWith(rejected)) {
                return false;
            }
        }

        Matcher matcher = LINKEDIN_PROFILE_PATTERN.matcher(trimmed);
        return matcher.matches();
    }

    /**
     * Returns true when the URL looks like a LinkedIn domain but has a non-profile path
     * (company, job, feed, etc.).  Useful for producing a more specific error message.
     */
    public static boolean isWrongLinkedInPath(String value) {
        if (value == null || value.isBlank()) return false;
        String trimmed = value.strip();
        String withoutOrigin = trimmed.replaceAll("(?i)^(?:https?://)?(?:www\\.)?linkedin\\.com", "");
        if (withoutOrigin.equals(trimmed)) return false;
        String pathLower = withoutOrigin.toLowerCase();
        for (String rejected : REJECTED_PATH_PREFIXES) {
            if (pathLower.startsWith(rejected)) return true;
        }
        return false;
    }

    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        Matcher matcher = LINKEDIN_PROFILE_PATTERN.matcher(value.strip());
        if (matcher.matches()) {
            String slug = matcher.group(1);
            return "https://www.linkedin.com/in/" + slug;
        }
        return value.strip();
    }
}
