package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.CreateCandidateProfileRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("POST /api/v1/candidates — Integration")
class CandidateV1ControllerIntegrationTest extends BaseControllerIntegrationTest {

    @Nested
    @DisplayName("/profile")
    class Profile {

        @Test
        @DisplayName("valid profile returns 201 with candidateCode")
        void validProfile_returns201WithCandidateCode() throws Exception {
            CreateCandidateProfileRequest request = validProfileRequest();

            mockMvc.perform(post("/api/v1/candidates/profile")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.candidateCode", notNullValue()));
        }

        @Test
        @DisplayName("candidateCode follows expected CND-XXXXXX format")
        void candidateCode_followsExpectedFormat() throws Exception {
            CreateCandidateProfileRequest request = validProfileRequest();

            mockMvc.perform(post("/api/v1/candidates/profile")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(request)))
                .andExpect(jsonPath("$.data.candidateCode").value(
                    org.hamcrest.Matchers.matchesPattern("CND-[A-Z0-9]{6,}")
                ));
        }

        @Test
        @DisplayName("missing fullName returns 400")
        void missingFullName_returns400() throws Exception {
            CreateCandidateProfileRequest request = validProfileRequest();
            request.setFullName(null);

            mockMvc.perform(post("/api/v1/candidates/profile")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ok").value(false));
        }

        @Test
        @DisplayName("missing email returns 400")
        void missingEmail_returns400() throws Exception {
            CreateCandidateProfileRequest request = validProfileRequest();
            request.setEmail(null);

            mockMvc.perform(post("/api/v1/candidates/profile")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(request)))
                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("invalid LinkedIn URL returns 400")
        void invalidLinkedInUrl_returns400() throws Exception {
            CreateCandidateProfileRequest request = validProfileRequest();
            request.setLinkedinUrl("not-a-valid-url");

            mockMvc.perform(post("/api/v1/candidates/profile")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(request)))
                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("response includes full name and career stage")
        void response_includesFullNameAndCareerStage() throws Exception {
            CreateCandidateProfileRequest request = validProfileRequest();

            mockMvc.perform(post("/api/v1/candidates/profile")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(request)))
                .andExpect(jsonPath("$.data.fullName").value("Kavita Rao"))
                .andExpect(jsonPath("$.data.careerStage").value("WORKING_PROFESSIONAL"));
        }
    }

    private CreateCandidateProfileRequest validProfileRequest() {
        CreateCandidateProfileRequest req = new CreateCandidateProfileRequest();
        req.setFullName("Kavita Rao");
        req.setEmail("kavita@example.com");
        req.setMobileNumber("9876543210");
        req.setCurrentRole("Product Manager");
        req.setCareerStage(com.qualscore.qualcore.enums.CareerStage.WORKING_PROFESSIONAL);
        req.setIndustry("Technology");
        req.setLocation("Bangalore");
        req.setLinkedinUrl("https://linkedin.com/in/kavita-rao");
        return req;
    }
}
