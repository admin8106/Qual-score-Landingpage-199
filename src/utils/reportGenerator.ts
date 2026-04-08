import { DiagnosticAnswer, ReportData, CandidateDetails } from '../types';
import {
  calculateCategoryScores,
  calculateOverallScore,
  getScoreLabel,
  generateFindings,
  generateRecommendations,
} from './scoreCalculator';

export function generateReport(
  answers: DiagnosticAnswer[],
  candidate: CandidateDetails,
  leadId: string,
  sessionId: string
): ReportData {
  const categoryScores = calculateCategoryScores(answers);
  const overallScore = calculateOverallScore(categoryScores);
  const scoreLevel = overallScore < 30
    ? 'critical'
    : overallScore < 50
    ? 'low'
    : overallScore < 65
    ? 'moderate'
    : overallScore < 80
    ? 'strong'
    : 'excellent';

  return {
    leadId,
    sessionId,
    candidateName: candidate.name,
    overallScore,
    scoreLevel,
    scoreLabel: getScoreLabel(overallScore),
    categoryScores,
    findings: generateFindings(answers, categoryScores),
    recommendations: generateRecommendations(categoryScores, overallScore),
    generatedAt: new Date().toISOString(),
  };
}
