package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.LinkedInAnalysisResult;
import com.qualscore.qualcore.enums.LinkedInAnalysisStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LinkedInAnalysisResultRepository extends JpaRepository<LinkedInAnalysisResult, UUID> {

    Optional<LinkedInAnalysisResult> findTopByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    List<LinkedInAnalysisResult> findByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    List<LinkedInAnalysisResult> findByAnalysisStatusOrderByCreatedAtDesc(LinkedInAnalysisStatus status);

    boolean existsByCandidateProfileIdAndAnalysisStatus(UUID candidateProfileId, LinkedInAnalysisStatus status);
}
