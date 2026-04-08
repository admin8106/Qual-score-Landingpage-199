package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.catalog.DiagnosticScoreResult;
import com.qualscore.qualcore.constants.DiagnosticConstants;
import com.qualscore.qualcore.enums.ScoreBand;
import com.qualscore.qualcore.service.FinalScoreCalculator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class FinalScoreCalculatorImpl implements FinalScoreCalculator {

    @Override
    public double calculate(DiagnosticScoreResult sections, double linkedinScore) {
        double raw =
                (linkedinScore                       * DiagnosticConstants.WEIGHT_LINKEDIN) +
                (sections.getCareerDirectionScore()  * DiagnosticConstants.WEIGHT_CAREER_DIRECTION) +
                (sections.getJobSearchBehaviorScore()* DiagnosticConstants.WEIGHT_JOB_SEARCH) +
                (sections.getOpportunityReadinessScore() * DiagnosticConstants.WEIGHT_READINESS) +
                (sections.getFlexibilityScore()      * DiagnosticConstants.WEIGHT_FLEXIBILITY) +
                (sections.getImprovementIntentScore()* DiagnosticConstants.WEIGHT_INTENT);

        double finalScore = Math.round(raw * 10.0) / 10.0;

        log.debug("Final score calculated: linkedin={}, CD={}, JS={}, OR={}, FL={}, II={} → raw={} → {}",
                linkedinScore,
                sections.getCareerDirectionScore(),
                sections.getJobSearchBehaviorScore(),
                sections.getOpportunityReadinessScore(),
                sections.getFlexibilityScore(),
                sections.getImprovementIntentScore(),
                raw, finalScore);

        return finalScore;
    }

    @Override
    public ScoreBand resolveBand(double finalScore) {
        return ScoreBand.fromScore(finalScore);
    }
}
