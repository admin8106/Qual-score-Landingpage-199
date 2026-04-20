package com.qualscore.qualcore.service;

import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.catalog.ScoredAnswer;

import java.util.List;

public interface TaggingService {

    List<String> generateTags(DiagnosticScoreResult scoreResult, double finalEmployabilityScore);
}
