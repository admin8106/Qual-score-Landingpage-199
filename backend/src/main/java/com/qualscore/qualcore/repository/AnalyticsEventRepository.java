package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.AnalyticsEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, UUID> {

    List<AnalyticsEvent> findByEventNameOrderByCreatedAtDesc(String eventName);

    List<AnalyticsEvent> findByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    @Query("""
            SELECT ae.eventName, COUNT(ae)
            FROM AnalyticsEvent ae
            WHERE ae.createdAt >= :since
            GROUP BY ae.eventName
            ORDER BY COUNT(ae) DESC
            """)
    List<Object[]> countEventsSince(@Param("since") OffsetDateTime since);

    @Query("""
            SELECT CAST(ae.createdAt AS date), ae.eventName, COUNT(ae)
            FROM AnalyticsEvent ae
            WHERE ae.createdAt >= :since
            GROUP BY CAST(ae.createdAt AS date), ae.eventName
            ORDER BY CAST(ae.createdAt AS date) ASC
            """)
    List<Object[]> getDailyEventCountsSince(@Param("since") OffsetDateTime since);
}
