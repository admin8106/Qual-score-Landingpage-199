package com.qualscore.qualcore.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.dto.request.LogAnalyticsEventRequest;
import com.qualscore.qualcore.dto.response.FetchAnalyticsResponse;
import com.qualscore.qualcore.dto.response.LogAnalyticsEventResponse;
import com.qualscore.qualcore.entity.AnalyticsEvent;
import com.qualscore.qualcore.repository.AnalyticsEventRepository;
import com.qualscore.qualcore.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {

    private final AnalyticsEventRepository analyticsEventRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public LogAnalyticsEventResponse logEvent(LogAnalyticsEventRequest request) {
        String metadataJson;
        try {
            metadataJson = request.getProperties() != null
                    ? objectMapper.writeValueAsString(request.getProperties())
                    : "{}";
        } catch (JsonProcessingException e) {
            metadataJson = "{}";
        }

        AnalyticsEvent event = AnalyticsEvent.builder()
                .eventName(request.getEventName())
                .source(request.getAnonymousId())
                .metadataJson(metadataJson)
                .build();

        event = analyticsEventRepository.save(event);
        log.debug("Analytics event logged: name={}, id={}", request.getEventName(), event.getId());

        return LogAnalyticsEventResponse.builder()
                .eventId(event.getId().toString())
                .recorded(true)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FetchAnalyticsResponse fetchAnalytics(int daysBack) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(daysBack);

        List<Object[]> rawCounts = analyticsEventRepository.countEventsSince(since);
        Map<String, Long> eventCounts = new LinkedHashMap<>();
        for (Object[] row : rawCounts) {
            eventCounts.put((String) row[0], (Long) row[1]);
        }

        Map<String, Double> conversionRates = computeConversionRates(eventCounts);

        List<Object[]> rawDaily = analyticsEventRepository.getDailyEventCountsSince(since);
        Map<String, Map<String, Long>> dailyMap = new LinkedHashMap<>();
        for (Object[] row : rawDaily) {
            String date = row[0].toString();
            String eventName = (String) row[1];
            Long count = (Long) row[2];
            dailyMap.computeIfAbsent(date, k -> new LinkedHashMap<>()).put(eventName, count);
        }

        List<FetchAnalyticsResponse.DailySeriesEntry> dailySeries = dailyMap.entrySet().stream()
                .map(e -> FetchAnalyticsResponse.DailySeriesEntry.builder()
                        .date(e.getKey())
                        .counts(e.getValue())
                        .build())
                .toList();

        return FetchAnalyticsResponse.builder()
                .eventCounts(eventCounts)
                .conversionRates(conversionRates)
                .topCtaSources(List.of())
                .dailySeries(dailySeries)
                .fetchedAt(OffsetDateTime.now().toString())
                .build();
    }

    private Map<String, Double> computeConversionRates(Map<String, Long> counts) {
        Map<String, Double> rates = new LinkedHashMap<>();
        long views = counts.getOrDefault("landing_page_view", 1L);
        long checkouts = counts.getOrDefault("checkout_page_view", 0L);
        long payments = counts.getOrDefault("payment_verified", 0L);
        long diagnostics = counts.getOrDefault("diagnostic_completed", 0L);
        long reports = counts.getOrDefault("report_generated", 0L);
        long bookings = counts.getOrDefault("consultation_booked", 0L);

        rates.put("view_to_checkout", views > 0 ? round((double) checkouts / views * 100) : 0.0);
        rates.put("checkout_to_payment", checkouts > 0 ? round((double) payments / checkouts * 100) : 0.0);
        rates.put("payment_to_diagnostic", payments > 0 ? round((double) diagnostics / payments * 100) : 0.0);
        rates.put("diagnostic_to_report", diagnostics > 0 ? round((double) reports / diagnostics * 100) : 0.0);
        rates.put("report_to_booking", reports > 0 ? round((double) bookings / reports * 100) : 0.0);
        return rates;
    }

    private double round(double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}
