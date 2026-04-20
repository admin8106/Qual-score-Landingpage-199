package com.qualscore.qualcore.mapper;

import com.qualscore.qualcore.dto.response.DiagnosticAnswerResponse;
import com.qualscore.qualcore.entity.DiagnosticQuestionResponse;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DiagnosticQuestionResponseMapper {

    DiagnosticAnswerResponse toResponse(DiagnosticQuestionResponse entity);

    List<DiagnosticAnswerResponse> toResponseList(List<DiagnosticQuestionResponse> entities);
}
