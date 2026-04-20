package com.qualscore.qualcore.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "diagnostic_question_responses",
        indexes = {
                @Index(name = "idx_dqr_candidate_profile_id", columnList = "candidate_profile_id"),
                @Index(name = "idx_dqr_section_code", columnList = "section_code"),
                @Index(name = "idx_dqr_candidate_section", columnList = "candidate_profile_id, section_code")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosticQuestionResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_profile_id", nullable = false)
    private CandidateProfile candidateProfile;

    @Column(name = "question_code", nullable = false, length = 20)
    private String questionCode;

    @Column(name = "section_code", nullable = false, length = 40)
    private String sectionCode;

    @Column(name = "selected_option_code", nullable = false, length = 20)
    private String selectedOptionCode;

    @Column(name = "selected_option_text", nullable = false)
    private String selectedOptionText;

    @Column(name = "score", nullable = false)
    private Integer score;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
