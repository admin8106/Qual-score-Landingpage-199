package com.qualscore.qualcore.monitoring;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;

/**
 * Central monitoring service for structured operational event logging and metric recording.
 *
 * Usage pattern:
 *   MonitoringService#recordAiFailure(...)    — log + increment counter on AI generation failure
 *   MonitoringService#recordAiSuccess(...)    — log + record AI call latency
 *   MonitoringService#recordPaymentEvent(...) — log + counter for payment lifecycle events
 *   MonitoringService#recordWebhookEvent(...) — log + counter for webhook processing outcomes
 *
 * All log events include structured context (MDC + structured parameters) for log aggregator queries.
 * All metrics are Micrometer-backed and available at /actuator/prometheus for Prometheus scraping.
 *
 * Naming conventions:
 *   Counter names: qualcore.<domain>.<outcome>   (e.g. qualcore.ai.failure)
 *   Timer names:   qualcore.<domain>.<operation> (e.g. qualcore.ai.generation_time)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MonitoringService {

    private final MeterRegistry meterRegistry;

    private Counter aiSuccessCounter;
    private Counter aiFailureCounter;
    private Counter aiFallbackCounter;
    private Counter paymentInitiatedCounter;
    private Counter paymentVerifiedCounter;
    private Counter paymentFailedCounter;
    private Counter webhookReceivedCounter;
    private Counter webhookProcessedCounter;
    private Counter webhookRejectedCounter;
    private Counter webhookDuplicateCounter;

    @PostConstruct
    void initMetrics() {
        aiSuccessCounter = Counter.builder("qualcore.ai.success")
            .description("AI report generation succeeded")
            .register(meterRegistry);

        aiFailureCounter = Counter.builder("qualcore.ai.failure")
            .description("AI report generation failed")
            .register(meterRegistry);

        aiFallbackCounter = Counter.builder("qualcore.ai.fallback")
            .description("Report fell back to rule-based generation")
            .register(meterRegistry);

        paymentInitiatedCounter = Counter.builder("qualcore.payment.initiated")
            .description("Payment orders initiated")
            .register(meterRegistry);

        paymentVerifiedCounter = Counter.builder("qualcore.payment.verified")
            .description("Payments verified successfully")
            .register(meterRegistry);

        paymentFailedCounter = Counter.builder("qualcore.payment.failed")
            .description("Payment verifications failed")
            .register(meterRegistry);

        webhookReceivedCounter = Counter.builder("qualcore.webhook.received")
            .description("Webhook events received")
            .register(meterRegistry);

        webhookProcessedCounter = Counter.builder("qualcore.webhook.processed")
            .description("Webhook events processed successfully")
            .register(meterRegistry);

        webhookRejectedCounter = Counter.builder("qualcore.webhook.rejected")
            .description("Webhook events rejected (invalid signature)")
            .register(meterRegistry);

        webhookDuplicateCounter = Counter.builder("qualcore.webhook.duplicate")
            .description("Duplicate webhook events detected")
            .register(meterRegistry);
    }

    public void recordAiSuccess(String candidateCode, int attempts, long durationMs) {
        aiSuccessCounter.increment();
        Timer.builder("qualcore.ai.generation_time")
            .description("Time taken for successful AI report generation")
            .register(meterRegistry)
            .record(Duration.ofMillis(durationMs));

        log.info("[Monitor][AI] SUCCESS candidateCode={} attempts={} durationMs={}",
            candidateCode, attempts, durationMs);
    }

    public void recordAiFailure(String candidateCode, int attempts, String errorMessage) {
        aiFailureCounter.increment();
        log.error("[Monitor][AI] FAILURE candidateCode={} attempts={} error=\"{}\"",
            candidateCode, attempts, sanitize(errorMessage));
    }

    public void recordAiFallback(String candidateCode, String reason) {
        aiFallbackCounter.increment();
        log.warn("[Monitor][AI] FALLBACK candidateCode={} reason=\"{}\"",
            candidateCode, reason);
    }

    public void recordPaymentInitiated(String paymentReference, int amountPaise, String provider) {
        paymentInitiatedCounter.increment();
        log.info("[Monitor][Payment] INITIATED ref={} amountPaise={} provider={}",
            paymentReference, amountPaise, provider);
    }

    public void recordPaymentVerified(String paymentReference, String gatewayPaymentId, String provider) {
        paymentVerifiedCounter.increment();
        log.info("[Monitor][Payment] VERIFIED ref={} gatewayPaymentId={} provider={}",
            paymentReference, gatewayPaymentId, provider);
    }

    public void recordPaymentFailed(String paymentReference, String reason, String provider) {
        paymentFailedCounter.increment();
        log.error("[Monitor][Payment] FAILED ref={} reason=\"{}\" provider={}",
            paymentReference, sanitize(reason), provider);
    }

    public void recordPaymentSignatureRejected(String gatewayOrderId, String provider) {
        paymentFailedCounter.increment();
        log.error("[Monitor][Payment] SIGNATURE_REJECTED gatewayOrderId={} provider={}",
            gatewayOrderId, provider);
    }

    public void recordWebhookReceived(String eventId, int payloadBytes) {
        webhookReceivedCounter.increment();
        log.info("[Monitor][Webhook] RECEIVED eventId={} payloadBytes={}", eventId, payloadBytes);
    }

    public void recordWebhookProcessed(String eventId, String paymentReference) {
        webhookProcessedCounter.increment();
        log.info("[Monitor][Webhook] PROCESSED eventId={} paymentReference={}", eventId, paymentReference);
    }

    public void recordWebhookRejected(String eventId, String reason) {
        webhookRejectedCounter.increment();
        log.error("[Monitor][Webhook] REJECTED eventId={} reason=\"{}\"", eventId, sanitize(reason));
    }

    public void recordWebhookDuplicate(String eventId) {
        webhookDuplicateCounter.increment();
        log.warn("[Monitor][Webhook] DUPLICATE eventId={}", eventId);
    }

    public void recordCandidateCreated(String candidateCode, String careerStage, String industry) {
        Counter.builder("qualcore.candidate.created")
            .tag("careerStage", careerStage != null ? careerStage : "UNKNOWN")
            .description("Candidate profiles created")
            .register(meterRegistry)
            .increment();

        log.info("[Monitor][Candidate] CREATED candidateCode={} careerStage={} industry={}",
            candidateCode, careerStage, industry);
    }

    public void recordReportGenerated(String candidateCode, String reportStatus, String bandLabel) {
        Counter.builder("qualcore.report.generated")
            .tag("status", reportStatus != null ? reportStatus : "UNKNOWN")
            .tag("band", bandLabel != null ? bandLabel : "UNKNOWN")
            .description("Diagnostic reports generated")
            .register(meterRegistry)
            .increment();

        log.info("[Monitor][Report] GENERATED candidateCode={} status={} band={}",
            candidateCode, reportStatus, bandLabel);
    }

    public void recordBookingCreated(String candidateCode, String bookingRef) {
        Counter.builder("qualcore.booking.created")
            .description("Consultation bookings created")
            .register(meterRegistry)
            .increment();

        log.info("[Monitor][Booking] CREATED candidateCode={} bookingRef={}", candidateCode, bookingRef);
    }

    public void recordRequestError(String endpoint, int statusCode, String errorCode) {
        Counter.builder("qualcore.request.error")
            .tag("status", String.valueOf(statusCode))
            .tag("code", errorCode != null ? errorCode : "UNKNOWN")
            .description("API request errors by status and code")
            .register(meterRegistry)
            .increment();

        if (statusCode >= 500) {
            log.error("[Monitor][Request] ERROR endpoint={} status={} code={}",
                endpoint, statusCode, errorCode);
        }
    }

    public void withContext(Map<String, String> context, Runnable action) {
        context.forEach(MDC::put);
        try {
            action.run();
        } finally {
            context.keySet().forEach(MDC::remove);
        }
    }

    private String sanitize(String message) {
        if (message == null) return "(null)";
        return message.length() > 500 ? message.substring(0, 500) + "..." : message;
    }
}
