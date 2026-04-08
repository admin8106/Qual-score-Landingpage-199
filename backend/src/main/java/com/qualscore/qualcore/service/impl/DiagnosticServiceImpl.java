package com.qualscore.qualcore.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.catalog.ScoredAnswer;
import com.qualscore.qualcore.dto.request.CalculateDiagnosticResultRequest;
import com.qualscore.qualcore.dto.request.DiagnosticAnswerDto;
import com.qualscore.qualcore.dto.request.DiagnosticSubmitRequest;
import com.qualscore.qualcore.dto.request.FinalScoreDto;
import com.qualscore.qualcore.dto.request.SaveDiagnosticResponsesRequest;
import com.qualscore.qualcore.dto.response.CalculateDiagnosticResultResponse;
import com.qualscore.qualcore.dto.response.DiagnosticAnswerResponse;
import com.qualscore.qualcore.dto.response.DiagnosticSubmitResponse;
import com.qualscore.qualcore.dto.response.SaveDiagnosticResponsesResponse;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.DiagnosticAnswerEmbed;
import com.qualscore.qualcore.entity.DiagnosticQuestionResponse;
import com.qualscore.qualcore.entity.DiagnosticSession;
import com.qualscore.qualcore.entity.Lead;
import com.qualscore.qualcore.enums.ScoreBand;
import com.qualscore.qualcore.enums.SessionStatus;
import com.qualscore.qualcore.exception.ResourceNotFoundException;
import com.qualscore.qualcore.repository.CandidateProfileRepository;
import com.qualscore.qualcore.repository.DiagnosticQuestionResponseRepository;
import com.qualscore.qualcore.repository.DiagnosticSessionRepository;
import com.qualscore.qualcore.repository.LeadRepository;
import com.qualscore.qualcore.service.DiagnosticScoringService;
import com.qualscore.qualcore.service.DiagnosticService;
import com.qualscore.qualcore.util.ScoringEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiagnosticServiceImpl implements DiagnosticService {

    private final DiagnosticSessionRepository sessionRepository;
    private final LeadRepository leadRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final DiagnosticQuestionResponseRepository questionResponseRepository;
    private final DiagnosticScoringService scoringService;
    private final ScoringEngine scoringEngine;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public DiagnosticSubmitResponse submitResponses(DiagnosticSubmitRequest request) {
        CandidateProfile candidate = candidateProfileRepository.findByCandidateCode(request.getCandidateCode())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", request.getCandidateCode()));

        DiagnosticScoreResult scored = scoringService.score(request.getAnswers());

        questionResponseRepository.deleteAllByCandidateProfileId(candidate.getId());

        List<DiagnosticQuestionResponse> responses = new ArrayList<>();
        for (ScoredAnswer answer : scored.getScoredAnswers()) {
            responses.add(DiagnosticQuestionResponse.builder()
                    .candidateProfile(candidate)
                    .questionCode(answer.getQuestionCode())
                    .sectionCode(answer.getSectionCode())
                    .selectedOptionCode(answer.getSelectedOptionCode())
                    .selectedOptionText(answer.getSelectedOptionLabel())
                    .score(answer.getBackendScore())
                    .build());
        }
        questionResponseRepository.saveAll(responses);

        List<DiagnosticAnswerResponse> answerResponses = responses.stream()
                .map(r -> DiagnosticAnswerResponse.builder()
                        .id(r.getId())
                        .questionCode(r.getQuestionCode())
                        .sectionCode(r.getSectionCode())
                        .selectedOptionCode(r.getSelectedOptionCode())
                        .score(r.getScore())
                        .build())
                .toList();

        log.info("Submitted {} diagnostic answers for candidateCode={}", responses.size(), request.getCandidateCode());

        return DiagnosticSubmitResponse.builder()
                .candidateCode(request.getCandidateCode())
                .answersRecorded(responses.size())
                .answers(answerResponses)
                .message("Responses recorded successfully. Proceed to trigger scoring analysis.")
                .build();
    }

    @Override
    @Transactional
    public SaveDiagnosticResponsesResponse saveResponses(SaveDiagnosticResponsesRequest request) {
        UUID leadId = UUID.fromString(request.getLeadId());
        UUID sessionId = UUID.fromString(request.getSessionId());

        DiagnosticSession session = sessionRepository.findByIdAndLeadId(sessionId, leadId)
                .orElseThrow(() -> new ResourceNotFoundException("DiagnosticSession", sessionId.toString()));

        List<DiagnosticAnswerEmbed> embeds = request.getAnswers().stream()
                .map(a -> DiagnosticAnswerEmbed.builder()
                        .questionId(a.getQuestionId())
                        .value(a.getValue())
                        .score(a.getScore())
                        .category(a.getCategory())
                        .build())
                .toList();

        session.setAnswers(embeds);

        if (request.getCompletedAt() != null) {
            session.setCompletedAt(OffsetDateTime.parse(request.getCompletedAt()));
            session.setStatus(SessionStatus.COMPLETED);
        }

        sessionRepository.save(session);

        Map<String, Integer> categoryBreakdown = buildCategoryBreakdown(request.getAnswers());

        log.info("Saved {} answers for sessionId={}", embeds.size(), sessionId);
        return SaveDiagnosticResponsesResponse.builder()
                .sessionId(sessionId.toString())
                .answersRecorded(embeds.size())
                .categoryBreakdown(categoryBreakdown)
                .savedAt(OffsetDateTime.now().toString())
                .build();
    }

    @Override
    @Transactional
    public CalculateDiagnosticResultResponse calculateResult(CalculateDiagnosticResultRequest request) {
        UUID leadId = UUID.fromString(request.getLeadId());
        UUID sessionId = UUID.fromString(request.getSessionId());

        DiagnosticSession session = sessionRepository.findByIdAndLeadId(sessionId, leadId)
                .orElseThrow(() -> new ResourceNotFoundException("DiagnosticSession", sessionId.toString()));

        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId.toString()));

        FinalScoreDto evaluation = scoringEngine.calculate(request.getAnswers(), request.getLinkedInAnalysis());

        BigDecimal finalScore = BigDecimal.valueOf(evaluation.getFinalEmployabilityScore());
        ScoreBand band = ScoreBand.fromScore(evaluation.getFinalEmployabilityScore());

        session.setFinalEmployabilityScore(finalScore);
        session.setScoreBand(band);
        session.setCrmTags(evaluation.getTags());
        session.setStatus(SessionStatus.COMPLETED);
        session.setCompletedAt(OffsetDateTime.now());

        try {
            session.setSectionScoresJson(objectMapper.writeValueAsString(evaluation.getSectionScores()));
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize section scores", e);
        }

        sessionRepository.save(session);

        lead.setFinalEmployabilityScore(finalScore);
        lead.setScoreBand(band);
        lead.setCrmTags(evaluation.getTags());
        leadRepository.save(lead);

        log.info("Score calculated for sessionId={}: score={}, band={}", sessionId, finalScore, band);
        return CalculateDiagnosticResultResponse.builder()
                .evaluation(evaluation)
                .computedAt(evaluation.getComputedAt())
                .build();
    }

    private Map<String, Integer> buildCategoryBreakdown(List<DiagnosticAnswerDto> answers) {
        Map<String, Integer> breakdown = new HashMap<>();
        for (DiagnosticAnswerDto answer : answers) {
            breakdown.merge(answer.getCategory(), 1, Integer::sum);
        }
        return breakdown;
    }
}
