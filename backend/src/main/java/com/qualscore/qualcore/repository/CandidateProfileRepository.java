package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.enums.CareerStage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidateProfileRepository extends JpaRepository<CandidateProfile, UUID> {

    Optional<CandidateProfile> findByEmail(String email);

    Optional<CandidateProfile> findByCandidateCode(String candidateCode);

    Optional<CandidateProfile> findByMobileNumber(String mobileNumber);

    boolean existsByEmail(String email);

    boolean existsByCandidateCode(String candidateCode);

    Page<CandidateProfile> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<CandidateProfile> findByCareerStageOrderByCreatedAtDesc(CareerStage careerStage, Pageable pageable);

    @Query("""
            SELECT cp FROM CandidateProfile cp
            WHERE (:search IS NULL
                   OR LOWER(cp.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(cp.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(cp.mobileNumber) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(cp.candidateCode) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY cp.createdAt DESC
            """)
    Page<CandidateProfile> search(@Param("search") String search, Pageable pageable);

    @Query("""
            SELECT cp FROM CandidateProfile cp
            WHERE EXISTS (
                SELECT 1 FROM DiagnosticReport dr WHERE dr.candidateProfile = cp
            )
            ORDER BY cp.createdAt DESC
            """)
    Page<CandidateProfile> findWithReport(Pageable pageable);

    @Query("""
            SELECT cp FROM CandidateProfile cp
            WHERE EXISTS (
                SELECT 1 FROM ConsultationBooking cb
                WHERE cb.candidateProfile = cp
                  AND cb.bookingStatus IN (
                      com.qualscore.qualcore.enums.BookingStatus.REQUESTED,
                      com.qualscore.qualcore.enums.BookingStatus.CONFIRMED
                  )
            )
            ORDER BY cp.createdAt DESC
            """)
    Page<CandidateProfile> findWithActiveBooking(Pageable pageable);
}
