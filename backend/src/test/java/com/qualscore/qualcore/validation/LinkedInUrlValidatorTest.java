package com.qualscore.qualcore.validation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LinkedInUrlValidator")
class LinkedInUrlValidatorTest {

    @Nested
    @DisplayName("isValidProfileUrl — should accept valid personal profile URLs")
    class ValidUrls {

        @ParameterizedTest(name = "[{index}] \"{0}\"")
        @ValueSource(strings = {
            "https://www.linkedin.com/in/john-doe",
            "http://linkedin.com/in/jane123",
            "linkedin.com/in/sample-user",
            "www.linkedin.com/in/abc-def/",
            "https://www.linkedin.com/in/name?trk=public_profile",
            "https://www.linkedin.com/in/priya-k/",
            "HTTPS://WWW.LINKEDIN.COM/IN/John-Doe",
            "https://www.linkedin.com/in/a-b-c-123",
        })
        void acceptsValidPersonalProfiles(String url) {
            assertThat(LinkedInUrlValidator.isValidProfileUrl(url))
                .as("Expected valid: %s", url)
                .isTrue();
        }
    }

    @Nested
    @DisplayName("isValidProfileUrl — should reject invalid or non-profile URLs")
    class InvalidUrls {

        @ParameterizedTest(name = "[{index}] \"{0}\"")
        @ValueSource(strings = {
            "google.com/test",
            "linkedin.com/company/test",
            "linkedin.com/feed/",
            "linkedin.com/jobs/view/123",
            "linkedin.com/posts/test",
            "linkedin.com/learning/test",
            "randomtext",
            "linkedin.com/in/",
            "linkedin.com",
            "https://linkedin.com/school/mit",
            "https://linkedin.com/pub/old-profile/1/2/3",
            "https://linkedin.com/groups/1234/",
            "https://linkedin.com/search/results/people/",
            "https://linkedin.com/messaging/",
            "https://www.linkedin.com/in/ab",
        })
        void rejectsInvalidOrNonProfileUrls(String url) {
            assertThat(LinkedInUrlValidator.isValidProfileUrl(url))
                .as("Expected invalid: %s", url)
                .isFalse();
        }

        @Test
        @DisplayName("rejects empty string")
        void rejectsEmptyString() {
            assertThat(LinkedInUrlValidator.isValidProfileUrl("")).isFalse();
        }

        @Test
        @DisplayName("rejects blank string")
        void rejectsBlankString() {
            assertThat(LinkedInUrlValidator.isValidProfileUrl("   ")).isFalse();
        }

        @Test
        @DisplayName("rejects null")
        void rejectsNull() {
            assertThat(LinkedInUrlValidator.isValidProfileUrl(null)).isFalse();
        }
    }

    @Nested
    @DisplayName("isWrongLinkedInPath — detects non-profile LinkedIn paths")
    class WrongPath {

        @ParameterizedTest(name = "[{index}] \"{0}\" → true")
        @ValueSource(strings = {
            "linkedin.com/company/test",
            "https://www.linkedin.com/feed/",
            "https://www.linkedin.com/jobs/view/123",
            "linkedin.com/posts/test",
            "linkedin.com/learning/test",
            "linkedin.com/school/mit",
            "linkedin.com/pub/old/1/2/3",
        })
        void detectsWrongLinkedInPaths(String url) {
            assertThat(LinkedInUrlValidator.isWrongLinkedInPath(url))
                .as("Expected wrong LinkedIn path: %s", url)
                .isTrue();
        }

        @ParameterizedTest(name = "[{index}] \"{0}\" → false")
        @ValueSource(strings = {
            "google.com/test",
            "randomtext",
            "",
            "https://www.linkedin.com/in/john-doe",
        })
        void doesNotFlagNonLinkedInOrValidProfile(String url) {
            assertThat(LinkedInUrlValidator.isWrongLinkedInPath(url))
                .as("Expected not wrong-path: %s", url)
                .isFalse();
        }
    }

    @Nested
    @DisplayName("normalize — produces canonical https://www.linkedin.com/in/{slug}")
    class Normalize {

        @Test
        @DisplayName("strips trailing slash")
        void stripsTrailingSlash() {
            assertThat(LinkedInUrlValidator.normalize("linkedin.com/in/john-doe/"))
                .isEqualTo("https://www.linkedin.com/in/john-doe");
        }

        @Test
        @DisplayName("strips tracking query params")
        void stripsQueryParams() {
            assertThat(LinkedInUrlValidator.normalize("https://www.linkedin.com/in/name?trk=public_profile"))
                .isEqualTo("https://www.linkedin.com/in/name");
        }

        @Test
        @DisplayName("upgrades http to https and adds www")
        void upgradesHttpAndAddsWww() {
            assertThat(LinkedInUrlValidator.normalize("http://linkedin.com/in/jane123"))
                .isEqualTo("https://www.linkedin.com/in/jane123");
        }

        @Test
        @DisplayName("returns input unchanged for invalid URL")
        void returnsInputUnchangedForInvalid() {
            String invalid = "google.com/test";
            assertThat(LinkedInUrlValidator.normalize(invalid)).isEqualTo(invalid);
        }

        @Test
        @DisplayName("returns null unchanged for null input")
        void returnsNullForNull() {
            assertThat(LinkedInUrlValidator.normalize(null)).isNull();
        }

        @Test
        @DisplayName("returns blank unchanged for blank input")
        void returnsBlankForBlank() {
            assertThat(LinkedInUrlValidator.normalize("   ")).isEqualTo("   ");
        }
    }

    @Nested
    @DisplayName("ConstraintValidator.isValid — null/blank treated as absent (not invalid)")
    class ConstraintValidatorBehavior {

        private final LinkedInUrlValidator validator = new LinkedInUrlValidator();

        @Test
        @DisplayName("isValid returns true for null (optional-field contract)")
        void nullIsConsideredAbsent() {
            assertThat(validator.isValid(null, null)).isTrue();
        }

        @Test
        @DisplayName("isValid returns true for blank (optional-field contract)")
        void blankIsConsideredAbsent() {
            assertThat(validator.isValid("   ", null)).isTrue();
        }

        @Test
        @DisplayName("isValid returns true for valid profile URL")
        void validUrlPasses() {
            assertThat(validator.isValid("https://www.linkedin.com/in/john-doe", null)).isTrue();
        }

        @Test
        @DisplayName("isValid returns false for company page URL")
        void companyPageFails() {
            assertThat(validator.isValid("linkedin.com/company/test", null)).isFalse();
        }
    }
}
