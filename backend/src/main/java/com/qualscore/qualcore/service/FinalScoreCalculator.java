package com.qualscore.qualcore.service;

import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.enums.ScoreBand;

public interface FinalScoreCalculator {

    double calculate(DiagnosticScoreResult sectionScores, double linkedinScore);

    ScoreBand resolveBand(double finalScore);
}
