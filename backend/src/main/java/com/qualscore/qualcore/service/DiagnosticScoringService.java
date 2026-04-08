package com.qualscore.qualcore.service;

import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.dto.request.DiagnosticAnswerRequest;

import java.util.List;

public interface DiagnosticScoringService {

    DiagnosticScoreResult score(List<DiagnosticAnswerRequest> answers);
}
