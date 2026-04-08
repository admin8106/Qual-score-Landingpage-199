package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class FetchAnalyticsResponse {
    private Map<String, Long> eventCounts;
    private Map<String, Double> conversionRates;
    private List<CtaSourceEntry> topCtaSources;
    private List<DailySeriesEntry> dailySeries;
    private String fetchedAt;

    @Data
    @Builder
    public static class CtaSourceEntry {
        private String source;
        private Long count;
    }

    @Data
    @Builder
    public static class DailySeriesEntry {
        private String date;
        private Map<String, Long> counts;
    }
}
