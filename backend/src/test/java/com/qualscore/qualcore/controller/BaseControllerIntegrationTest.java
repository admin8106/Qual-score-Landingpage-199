package com.qualscore.qualcore.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base class for controller integration tests.
 *
 * Boots the full Spring context with an in-memory H2 database (profile="test"),
 * Flyway migrations disabled, and security partially configured for testing.
 *
 * Usage:
 *   Extend this class in any controller integration test.
 *   Use {@code mockMvc} to perform requests and assert responses.
 *   Use {@code objectMapper} to serialize/deserialize request bodies.
 *
 * Profiles:
 *   @ActiveProfiles("test") — activates application-test.yml, disables external integrations
 *
 * Test isolation:
 *   Use @Transactional on test methods to roll back DB state after each test.
 *   Use @Sql("/sql/seed-data.sql") to seed specific fixtures when needed.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "integrations.openai.api-key=",
    "integrations.payment.provider=mock",
    "rate-limit.enabled=false"
})
public abstract class BaseControllerIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected String toJson(Object obj) throws Exception {
        return objectMapper.writeValueAsString(obj);
    }
}
