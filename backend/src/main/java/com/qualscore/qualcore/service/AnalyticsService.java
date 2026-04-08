package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.LogAnalyticsEventRequest;
import com.qualscore.qualcore.dto.response.FetchAnalyticsResponse;
import com.qualscore.qualcore.dto.response.LogAnalyticsEventResponse;

public interface AnalyticsService {

    LogAnalyticsEventResponse logEvent(LogAnalyticsEventRequest request);

    FetchAnalyticsResponse fetchAnalytics(int daysBack);
}
