package com.qualscore.qualcore.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("System endpoints — Integration")
class SystemControllerIntegrationTest extends BaseControllerIntegrationTest {

    @Test
    @DisplayName("GET /actuator/health returns 200 with UP status")
    void actuatorHealth_returns200() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("GET /actuator/health/liveness returns 200")
    void actuatorHealthLiveness_returns200() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /actuator/health/readiness returns 200")
    void actuatorHealthReadiness_returns200() throws Exception {
        mockMvc.perform(get("/actuator/health/readiness"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/system/version returns version info")
    void systemVersion_returnsVersionInfo() throws Exception {
        mockMvc.perform(get("/api/system/version"))
            .andExpect(status().isOk());
    }
}
