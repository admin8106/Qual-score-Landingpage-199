package com.qualscore.qualcore.mapper;

import com.qualscore.qualcore.dto.response.DiagnosticScoreResponse;
import com.qualscore.qualcore.entity.DiagnosticScore;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DiagnosticScoreMapper {

    @Mapping(target = "candidateCode", source = "candidateProfile.candidateCode")
    @Mapping(target = "careerDirectionScore", expression = "java(entity.getCareerDirectionScore() != null ? entity.getCareerDirectionScore().doubleValue() : null)")
    @Mapping(target = "jobSearchBehaviorScore", expression = "java(entity.getJobSearchBehaviorScore() != null ? entity.getJobSearchBehaviorScore().doubleValue() : null)")
    @Mapping(target = "opportunityReadinessScore", expression = "java(entity.getOpportunityReadinessScore() != null ? entity.getOpportunityReadinessScore().doubleValue() : null)")
    @Mapping(target = "flexibilityConstraintsScore", expression = "java(entity.getFlexibilityConstraintsScore() != null ? entity.getFlexibilityConstraintsScore().doubleValue() : null)")
    @Mapping(target = "improvementIntentScore", expression = "java(entity.getImprovementIntentScore() != null ? entity.getImprovementIntentScore().doubleValue() : null)")
    @Mapping(target = "linkedinScore", expression = "java(entity.getLinkedinScore() != null ? entity.getLinkedinScore().doubleValue() : null)")
    @Mapping(target = "finalEmployabilityScore", expression = "java(entity.getFinalEmployabilityScore() != null ? entity.getFinalEmployabilityScore().doubleValue() : null)")
    @Mapping(target = "tags", ignore = true)
    @Mapping(target = "calculatedAt", source = "updatedAt")
    DiagnosticScoreResponse toResponse(DiagnosticScore entity);
}
