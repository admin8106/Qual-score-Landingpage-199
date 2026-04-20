package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.DiagnosticQuestionResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DiagnosticQuestionResponseRepository extends JpaRepository<DiagnosticQuestionResponse, UUID> {

    List<DiagnosticQuestionResponse> findByCandidateProfileIdOrderByQuestionCode(UUID candidateProfileId);

    List<DiagnosticQuestionResponse> findByCandidateProfileIdAndSectionCode(UUID candidateProfileId, String sectionCode);

    long countByCandidateProfileId(UUID candidateProfileId);

    void deleteAllByCandidateProfileId(UUID candidateProfileId);

    @Query("""
            SELECT dqr.sectionCode, AVG(dqr.score)
            FROM DiagnosticQuestionResponse dqr
            WHERE dqr.candidateProfile.id = :candidateProfileId
            GROUP BY dqr.sectionCode
            """)
    List<Object[]> averageScorePerSection(@Param("candidateProfileId") UUID candidateProfileId);
}
