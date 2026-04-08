package com.qualscore.qualcore.notification;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.ConsultationBooking;
import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.EventType;
import com.qualscore.qualcore.enums.LeadPriority;
import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import com.qualscore.qualcore.service.AdminLeadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Builds the canonical {@link CrmPayload} from domain entities.
 *
 * Always call one of the overloaded {@code build()} methods from
 * {@link com.qualscore.qualcore.service.AutomationTriggerService}.
 * Do not instantiate CrmPayload directly from service code.
 *
 * Aggregation logic:
 *   - paymentStatus: COMPLETED if any SUCCESS/VERIFIED tx found; PENDING if INITIATED; else FAILED
 *   - tags: parsed from DiagnosticScore.tagsJson (JSON array)
 *   - leadPriority: derived from tags via AdminLeadServiceImpl.derivePriority()
 *   - reportStatus / consultationStatus: "NONE" if no entity exists
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CrmPayloadBuilder {

    private final ObjectMapper objectMapper;
    private final AdminLeadService adminLeadService;

    public CrmPayload build(
            CandidateProfile candidate,
            Optional<DiagnosticScore> scoreOpt,
            Optional<DiagnosticReport> reportOpt,
            Optional<ConsultationBooking> bookingOpt,
            List<PaymentTransaction> payments,
            EventType triggerEvent) {

        List<String> tags = scoreOpt
                .map(s -> parseTags(s.getTagsJson()))
                .orElse(Collections.emptyList());

        LeadPriority priority = adminLeadService.derivePriority(tags);

        String paymentStatus = resolvePaymentStatus(payments);
        String reportStatus  = reportOpt.map(r -> r.getReportStatus().name()).orElse("NONE");
        String consultationStatus = bookingOpt.map(b -> b.getBookingStatus().name()).orElse("NONE");

        return new CrmPayload(
                candidate.getCandidateCode(),
                candidate.getFullName(),
                candidate.getEmail(),
                candidate.getMobileNumber(),
                candidate.getCurrentRole(),
                candidate.getTotalExperienceYears(),
                candidate.getCareerStage(),
                candidate.getIndustry(),
                candidate.getLinkedinUrl(),
                scoreOpt.map(DiagnosticScore::getFinalEmployabilityScore).orElse(null),
                scoreOpt.map(DiagnosticScore::getBandLabel).orElse(null),
                tags,
                priority.name(),
                paymentStatus,
                reportStatus,
                consultationStatus,
                triggerEvent.name(),
                OffsetDateTime.now(),
                candidate.getCreatedAt()
        );
    }

    public String toJson(CrmPayload payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.error("[CrmPayloadBuilder] Failed to serialise CrmPayload: {}", e.getMessage());
            return "{}";
        }
    }

    private String resolvePaymentStatus(List<PaymentTransaction> payments) {
        if (payments == null || payments.isEmpty()) return "NONE";
        for (PaymentTransaction pt : payments) {
            if (pt.getStatus() == PaymentTransactionStatus.SUCCESS
                    || pt.getStatus() == PaymentTransactionStatus.VERIFIED) return "COMPLETED";
        }
        for (PaymentTransaction pt : payments) {
            if (pt.getStatus() == PaymentTransactionStatus.INITIATED) return "PENDING";
        }
        return payments.get(0).getStatus().name();
    }

    private List<String> parseTags(String tagsJson) {
        if (tagsJson == null || tagsJson.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(tagsJson, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[CrmPayloadBuilder] Failed to parse tags JSON: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
