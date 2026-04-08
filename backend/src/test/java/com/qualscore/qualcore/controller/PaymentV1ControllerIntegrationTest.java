package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.PaymentInitiateRequest;
import com.qualscore.qualcore.dto.request.PaymentVerifyRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("POST /api/v1/payments — Integration")
class PaymentV1ControllerIntegrationTest extends BaseControllerIntegrationTest {

    @Nested
    @DisplayName("/initiate")
    class Initiate {

        @Test
        @DisplayName("valid request returns 201 with paymentReference and gatewayOrderId")
        void validRequest_returns201WithPaymentReference() throws Exception {
            PaymentInitiateRequest request = new PaymentInitiateRequest();
            request.setCandidateName("Arjun Sharma");
            request.setEmail("arjun@example.com");
            request.setAmountPaise(49900);

            mockMvc.perform(post("/api/v1/payments/initiate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.paymentReference").exists())
                .andExpect(jsonPath("$.data.gatewayOrderId").exists())
                .andExpect(jsonPath("$.data.amountPaise").value(49900));
        }

        @Test
        @DisplayName("missing email returns 400 with validation error")
        void missingEmail_returns400() throws Exception {
            PaymentInitiateRequest request = new PaymentInitiateRequest();
            request.setCandidateName("Arjun Sharma");
            request.setAmountPaise(49900);

            mockMvc.perform(post("/api/v1/payments/initiate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ok").value(false));
        }

        @Test
        @DisplayName("zero amount returns 400")
        void zeroAmount_returns400() throws Exception {
            PaymentInitiateRequest request = new PaymentInitiateRequest();
            request.setCandidateName("Arjun Sharma");
            request.setEmail("arjun@example.com");
            request.setAmountPaise(0);

            mockMvc.perform(post("/api/v1/payments/initiate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ok").value(false));
        }

        @Test
        @DisplayName("empty request body returns 400")
        void emptyBody_returns400() throws Exception {
            mockMvc.perform(post("/api/v1/payments/initiate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("/verify")
    class Verify {

        @Test
        @DisplayName("valid mock gateway verify request returns 200")
        void validVerifyRequest_returns200() throws Exception {
            PaymentInitiateRequest initiateRequest = new PaymentInitiateRequest();
            initiateRequest.setCandidateName("Priya Nair");
            initiateRequest.setEmail("priya@example.com");
            initiateRequest.setAmountPaise(49900);

            String initiateResponse = mockMvc.perform(post("/api/v1/payments/initiate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(initiateRequest)))
                .andReturn().getResponse().getContentAsString();

            String gatewayOrderId = objectMapper.readTree(initiateResponse)
                .path("data").path("gatewayOrderId").asText();

            PaymentVerifyRequest verifyRequest = new PaymentVerifyRequest();
            verifyRequest.setGatewayOrderId(gatewayOrderId);
            verifyRequest.setGatewayPaymentId("pay_mock_" + System.currentTimeMillis());
            verifyRequest.setGatewaySignature("mock-valid-signature");

            mockMvc.perform(post("/api/v1/payments/verify")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(verifyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.verified").exists())
                .andExpect(jsonPath("$.data.paymentReference").exists());
        }

        @Test
        @DisplayName("missing gatewayOrderId returns 400")
        void missingGatewayOrderId_returns400() throws Exception {
            PaymentVerifyRequest verifyRequest = new PaymentVerifyRequest();
            verifyRequest.setGatewayPaymentId("pay_test");
            verifyRequest.setGatewaySignature("sig_test");

            mockMvc.perform(post("/api/v1/payments/verify")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(toJson(verifyRequest)))
                .andExpect(status().isBadRequest());
        }
    }
}
