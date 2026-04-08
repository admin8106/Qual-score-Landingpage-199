package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.DiagnosticScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiagnosticScoreRepository extends JpaRepository<DiagnosticScore, UUID> {

    Optional<DiagnosticScore> findByCandidateProfileId(UUID candidateProfileId);

    boolean existsByCandidateProfileId(UUID candidateProfileId);

    @Query("""
            SELECT ds FROM DiagnosticScore ds
            WHERE ds.finalEmployabilityScore >= :minScore
              AND ds.finalEmployabilityScore <= :maxScore
            ORDER BY ds.finalEmployabilityScore DESC
            """)
    List<DiagnosticScore> findByScoreRange(
            @Param("minScore") BigDecimal minScore,
            @Param("maxScore") BigDecimal maxScore
    );

    @Query("SELECT AVG(ds.finalEmployabilityScore) FROM DiagnosticScore ds")
    Optional<Double> averageFinalScore();
}
