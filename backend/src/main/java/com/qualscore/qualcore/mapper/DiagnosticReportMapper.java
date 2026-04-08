package com.qualscore.qualcore.mapper;

import com.qualscore.qualcore.dto.response.DiagnosticReportResponse;
import com.qualscore.qualcore.entity.DiagnosticReport;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Maps DiagnosticReport entity to DiagnosticReportResponse DTO.
 *
 * JSON fields (scoreSummaryJson, dimensionBreakdownJson, topGapsJson) are
 * stored as raw JSON strings in the entity. MapStruct maps them to Object
 * fields in the DTO — Jackson serializes them as structured JSON when the
 * response is written to the HTTP response body.
 *
 * tagline: stored directly on the entity for quick access without
 * parsing the scoreSummaryJson blob.
 */
@Mapper(componentModel = "spring")
public interface DiagnosticReportMapper {

    @Mapping(target = "candidateCode", source = "candidateProfile.candidateCode")
    @Mapping(target = "scoreSummary", source = "scoreSummaryJson")
    @Mapping(target = "dimensionBreakdown", source = "dimensionBreakdownJson")
    @Mapping(target = "topGaps", source = "topGapsJson")
    @Mapping(target = "tagline", source = "tagline")
    DiagnosticReportResponse toResponse(DiagnosticReport entity);
}
