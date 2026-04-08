package com.qualscore.qualcore.mapper;

import com.qualscore.qualcore.dto.response.LinkedInAnalysisResponse;
import com.qualscore.qualcore.entity.LinkedInAnalysisResult;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface LinkedInAnalysisResultMapper {

    @Mapping(target = "candidateCode", source = "candidateProfile.candidateCode")
    @Mapping(target = "profileCompletenessScore", source = "profileCompleteness")
    @Mapping(target = "headlineQualityScore", source = "headlineClarity")
    @Mapping(target = "summaryStrengthScore", source = "aboutQuality")
    @Mapping(target = "experienceDepthScore", source = "experiencePresentation")
    @Mapping(target = "skillsRelevanceScore", source = "proofOfWorkVisibility")
    @Mapping(target = "recommendationsCountScore", source = "recommendationSignal")
    @Mapping(target = "connectionStrengthScore", source = "careerConsistency")
    @Mapping(target = "activityEngagementScore", source = "activityVisibility")
    @Mapping(target = "keywordOptimizationScore", source = "roleClarity")
    @Mapping(target = "photoQualityScore", source = "certificationsSignal")
    @Mapping(target = "educationPresenceScore", source = "growthProgression")
    @Mapping(target = "achievementQuantificationScore", source = "differentiationStrength")
    @Mapping(target = "personalBrandingScore", source = "recruiterAttractiveness")
    @Mapping(target = "summaryNotes", ignore = true)
    @Mapping(target = "topStrengths", ignore = true)
    @Mapping(target = "topConcerns", ignore = true)
    @Mapping(target = "analysedAt", source = "updatedAt")
    LinkedInAnalysisResponse toResponse(LinkedInAnalysisResult entity);
}
