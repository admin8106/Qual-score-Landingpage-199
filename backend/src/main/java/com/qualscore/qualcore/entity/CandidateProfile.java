package com.qualscore.qualcore.entity;

import com.qualscore.qualcore.entity.base.AuditableEntity;
import com.qualscore.qualcore.enums.CareerStage;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
        name = "candidate_profiles",
        indexes = {
                @Index(name = "idx_cp_email", columnList = "email"),
                @Index(name = "idx_cp_mobile", columnList = "mobile_number"),
                @Index(name = "idx_cp_candidate_code", columnList = "candidate_code", unique = true)
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateProfile extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "candidate_code", nullable = false, unique = true, length = 20)
    private String candidateCode;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "mobile_number", nullable = false, length = 20)
    private String mobileNumber;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "location")
    private String location;

    @Column(name = "current_role")
    private String currentRole;

    @Column(name = "total_experience_years", length = 10)
    private String totalExperienceYears;

    @Enumerated(EnumType.STRING)
    @Column(name = "career_stage", length = 30)
    private CareerStage careerStage;

    @Column(name = "industry")
    private String industry;

    @Column(name = "linkedin_url", length = 500)
    private String linkedinUrl;

    @Column(name = "linkedin_about_text", columnDefinition = "text")
    private String linkedinAboutText;

    @Column(name = "linkedin_experience_text", columnDefinition = "text")
    private String linkedinExperienceText;
}
