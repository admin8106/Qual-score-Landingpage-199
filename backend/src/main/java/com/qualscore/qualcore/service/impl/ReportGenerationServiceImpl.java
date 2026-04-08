package com.qualscore.qualcore.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qualscore.qualcore.config.OpenAiConfig;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.DiagnosticReport;
import com.qualscore.qualcore.entity.DiagnosticScore;
import com.qualscore.qualcore.entity.LinkedInAnalysisResult;
import com.qualscore.qualcore.enums.LinkedInIngestionMode;
import com.qualscore.qualcore.enums.ReportStatus;
import com.qualscore.qualcore.monitoring.MonitoringService;
import com.qualscore.qualcore.openai.AiJsonParser;
import com.qualscore.qualcore.openai.DynamicAiClient;
import com.qualscore.qualcore.openai.OpenAiClient;
import com.qualscore.qualcore.openai.PromptTemplateService;
import com.qualscore.qualcore.openai.ReportOutputValidator;
import com.qualscore.qualcore.openai.ReportOutputValidator.ValidationResult;
import com.qualscore.qualcore.openai.ReportPromptContext;
import com.qualscore.qualcore.openai.dto.AiCallResult;
import com.qualscore.qualcore.openai.dto.ChatMessage;
import com.qualscore.qualcore.openai.dto.ChatRequest;
import com.qualscore.qualcore.openai.dto.ResponseFormat;
import com.qualscore.qualcore.repository.DiagnosticReportRepository;
import com.qualscore.qualcore.service.ReportGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Implementation of the Prompt B (Report Generator) AI pipeline.
 *
 * ─────────────────────────────────────────────────────────
 * Full Output Schema (matches frontend contract):
 * {
 *   "reportTitle":         string,
 *   "scoreSummary":        { "employabilityScore": number, "bandLabel": string, "tagline": string },
 *   "linkedinInsight":     string,
 *   "behavioralInsight":   string,
 *   "dimensionBreakdown":  [ { "area", "score", "status", "remark" } × 6 ],
 *   "topGaps":             [ string × 3 ],
 *   "riskProjection":      string,
 *   "recommendation":      string,
 *   "recruiterViewInsight":string,
 *   "ctaBlock":            { "headline", "body", "buttonText" }
 * }
 *
 * ─────────────────────────────────────────────────────────
 * AI Flow (when OPENAI_API_KEY is configured):
 *   1. Build ReportPromptContext from all available candidate signals
 *   2. Build ChatRequest with response_format: json_object, temperature: 0.2
 *   3. Call OpenAiClient.complete() — attempt 1
 *   4. Parse and validate all required top-level fields via AiJsonParser
 *   5. If validation fails → retry once (attempt 2)
 *   6. If retry fails → fall back to deterministic template-based report
 *   7. Map parsed JSON → DiagnosticReport entity fields
 *   8. Persist with rawAiResponse and correct reportStatus
 *
 * ─────────────────────────────────────────────────────────
 * Fallback (rule-based) report:
 *   - Used when: AI not configured, or both AI attempts fail
 *   - Uses score thresholds, band label, and dimension values
 *   - Band-aware tone mirrored from Prompt B specification
 *   - Produces all 10 required schema fields deterministically
 *   - Persisted with reportStatus = RULE_BASED
 *
 * ─────────────────────────────────────────────────────────
 * Guardrails:
 *   - Reject any AI response with missing required top-level fields
 *   - Retry once before falling back — not twice
 *   - rawAiResponse always stored (even on failure) for audit/debugging
 *   - Auth errors (401/403) skip retry immediately
 *   - Never throws to the calling orchestration service
 *   - reportStatus is always set to reflect the actual generation path
 * ─────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportGenerationServiceImpl implements ReportGenerationService {

    private static final List<String> REQUIRED_AI_FIELDS = List.of(
            "reportTitle",
            "scoreSummary",
            "linkedinInsight",
            "behavioralInsight",
            "dimensionBreakdown",
            "topGaps",
            "riskProjection",
            "recommendation",
            "recruiterViewInsight",
            "ctaBlock"
    );

    private final DynamicAiClient dynamicAiClient;
    private final OpenAiClient openAiClient;
    private final OpenAiConfig openAiConfig;
    private final PromptTemplateService promptTemplateService;
    private final AiJsonParser aiJsonParser;
    private final ReportOutputValidator reportOutputValidator;
    private final DiagnosticReportRepository diagnosticReportRepository;
    private final MonitoringService monitoringService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public Map<String, Object> generateAndPersist(CandidateProfile candidate,
                                                   DiagnosticScore score,
                                                   LinkedInAnalysisResult linkedInResult) {
        String candidateCode = candidate.getCandidateCode();
        log.info("[ReportGen] Starting: candidateCode={}, aiConfigured={}",
                candidateCode, dynamicAiClient.isConfigured());

        ReportPromptContext context = buildContext(candidate, score, linkedInResult);

        Map<String, Object> reportContent;
        String rawAiResponse = null;
        ReportStatus reportStatus;
        String aiFailureReason = null;
        int aiAttempts = 0;

        String promptVersion = null;
        long startMs = System.currentTimeMillis();

        if (dynamicAiClient.isConfigured()) {
            AiGenerationResult aiResult = attemptAiGeneration(context, candidateCode);
            rawAiResponse  = aiResult.rawResponse;
            aiAttempts     = aiResult.attempts;
            aiFailureReason = aiResult.failureReason;

            if (aiResult.reportData != null) {
                reportContent = aiResult.reportData;
                reportStatus  = ReportStatus.GENERATED_AI;
                promptVersion = PromptTemplateService.REPORT_PROMPT_VERSION;
                long durationMs = System.currentTimeMillis() - startMs;
                log.info("[ReportGen] AI generation succeeded: candidateCode={}, attempts={}, durationMs={}, promptVersion={}",
                        candidateCode, aiResult.attempts, durationMs, promptVersion);
                monitoringService.recordAiSuccess(candidateCode, aiResult.attempts, durationMs);
            } else {
                log.warn("[ReportGen] AI failed after {} attempt(s) — reason=\"{}\" — using deterministic fallback: candidateCode={}",
                        aiResult.attempts, aiFailureReason, candidateCode);
                monitoringService.recordAiFailure(candidateCode, aiResult.attempts, aiFailureReason);
                monitoringService.recordAiFallback(candidateCode, "AI_FAILED_AFTER_" + aiResult.attempts + "_ATTEMPTS");
                reportContent = buildFallbackReport(context);
                reportStatus  = ReportStatus.GENERATED_FALLBACK;
            }
        } else {
            log.info("[ReportGen] AI not configured (OPENAI_API_KEY not set) — using rule-based report: candidateCode={}", candidateCode);
            monitoringService.recordAiFallback(candidateCode, "AI_NOT_CONFIGURED");
            reportContent = buildFallbackReport(context);
            reportStatus  = ReportStatus.RULE_BASED;
        }

        persistReport(candidate, score, reportContent, rawAiResponse, reportStatus, promptVersion, aiFailureReason, aiAttempts);
        monitoringService.recordReportGenerated(candidateCode, reportStatus.name(), context.getBandLabel());
        log.info("[ReportGen] Persisted: candidateCode={}, status={}, aiAttempts={}, promptVersion={}",
                candidateCode, reportStatus, aiAttempts, promptVersion);
        return reportContent;
    }

    private AiGenerationResult attemptAiGeneration(ReportPromptContext context, String candidateCode) {
        int maxAttempts    = dynamicAiClient.getMaxRetries() + 1;
        String lastRaw     = null;
        String lastFailure = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            log.info("[ReportGen] AI attempt {}/{}: candidateCode={}", attempt, maxAttempts, candidateCode);

            List<ChatMessage> messages = promptTemplateService.buildReportGenerationPrompt(context);
            ChatRequest request = ChatRequest.builder()
                    .model(openAiConfig.getModel())
                    .messages(messages)
                    .maxTokens(openAiConfig.getMaxTokens())
                    .temperature(openAiConfig.getTemperature())
                    .responseFormat(ResponseFormat.jsonObject())
                    .userReference(candidateCode)
                    .build();

            AiCallResult result = dynamicAiClient.complete(request, attempt);
            lastRaw = result.getRawContent();

            if (!result.isSuccess()) {
                lastFailure = "AI call failed (attempt " + attempt + "): " + result.getErrorMessage();
                log.warn("[ReportGen] Call failed (attempt={}): candidateCode={} error={}",
                        attempt, candidateCode, result.getErrorMessage());
                if (isAuthError(result.getErrorMessage())) {
                    lastFailure = "Auth error — API key rejected by OpenAI: " + result.getErrorMessage();
                    log.error("[ReportGen] Auth error — skipping retry: candidateCode={}", candidateCode);
                    break;
                }
                continue;
            }

            Optional<Map<String, Object>> parsed = aiJsonParser.parseToMap(
                    result.getRawContent(), REQUIRED_AI_FIELDS);

            if (parsed.isPresent()) {
                ValidationResult validation = reportOutputValidator.validate(parsed.get());
                if (validation.isValid()) {
                    return new AiGenerationResult(parsed.get(), lastRaw, attempt, null);
                }

                lastFailure = "Deep schema validation failed (attempt " + attempt + "): "
                        + String.join("; ", validation.getFailureReasons());
                log.warn("[ReportGen] Deep validation failed (attempt={}): candidateCode={} reasons={}",
                        attempt, candidateCode, validation.getFailureReasons());
            } else {
                lastFailure = "JSON parse or required-field check failed (attempt " + attempt
                        + "): missing one or more of " + REQUIRED_AI_FIELDS;
                log.warn("[ReportGen] JSON structure validation failed (attempt={}): candidateCode={} missing required fields or invalid JSON",
                        attempt, candidateCode);
            }
        }

        log.error("[ReportGen] All {} AI attempt(s) exhausted: candidateCode={} lastFailure=\"{}\"",
                maxAttempts, candidateCode, lastFailure);
        return new AiGenerationResult(null, lastRaw, maxAttempts, lastFailure);
    }

    private void persistReport(CandidateProfile candidate,
                                DiagnosticScore score,
                                Map<String, Object> content,
                                String rawAiResponse,
                                ReportStatus status,
                                String promptVersion,
                                String aiFailureReason,
                                int aiAttempts) {
        DiagnosticReport report = diagnosticReportRepository
                .findTopByCandidateProfileIdOrderByCreatedAtDesc(candidate.getId())
                .orElse(DiagnosticReport.builder().candidateProfile(candidate).build());

        report.setReportTitle(str(content, "reportTitle"));
        report.setLinkedinInsight(str(content, "linkedinInsight"));
        report.setBehavioralInsight(str(content, "behavioralInsight"));
        report.setRiskProjection(str(content, "riskProjection"));
        report.setRecommendation(str(content, "recommendation"));
        report.setRecruiterViewInsight(str(content, "recruiterViewInsight"));
        report.setTopGapsJson(aiJsonParser.toJson(content.get("topGaps")));
        report.setDimensionBreakdownJson(aiJsonParser.toJson(content.get("dimensionBreakdown")));
        report.setRawAiResponse(rawAiResponse);
        report.setReportStatus(status);
        report.setPromptVersion(promptVersion);
        report.setAiFailureReason(aiFailureReason);
        report.setAiAttempts(aiAttempts);

        Map<?, ?> scoreSummary = safeMap(content.get("scoreSummary"));
        report.setScoreSummaryJson(aiJsonParser.toJson(scoreSummary != null ? scoreSummary : buildScoreSummaryMap(score)));
        if (scoreSummary != null) {
            report.setTagline(objStr(scoreSummary, "tagline"));
        }

        Map<?, ?> ctaBlock = safeMap(content.get("ctaBlock"));
        if (ctaBlock != null) {
            report.setCtaHeadline(objStr(ctaBlock, "headline"));
            report.setCtaBody(objStr(ctaBlock, "body"));
            report.setCtaButtonText("Book Detailed Evaluation");
        } else {
            report.setCtaHeadline("Get a Detailed 1-on-1 Career Evaluation");
            report.setCtaBody(buildCtaBody(score.getFinalEmployabilityScore().doubleValue()));
            report.setCtaButtonText("Book Detailed Evaluation");
        }

        diagnosticReportRepository.save(report);
    }

    private ReportPromptContext buildContext(CandidateProfile candidate,
                                             DiagnosticScore score,
                                             LinkedInAnalysisResult li) {
        List<String> tags         = parseTags(score.getTagsJson());
        List<String> liStrengths  = parseJsonStringList(li != null ? li.getTopStrengthsJson() : null);
        List<String> liConcerns   = parseJsonStringList(li != null ? li.getTopConcernsJson() : null);
        String concernsText = !liConcerns.isEmpty() ? String.join(", ", liConcerns) : "Not available";

        return ReportPromptContext.builder()
                .candidateName(candidate.getFullName())
                .careerStage(candidate.getCareerStage() != null ? candidate.getCareerStage().name() : "UNKNOWN")
                .industry(nvl(candidate.getIndustry(), "General"))
                .currentRole(nvl(candidate.getCurrentRole(), "Professional"))
                .experienceYears(nvl(candidate.getTotalExperienceYears(), "Unknown"))
                .candidateCode(candidate.getCandidateCode())
                .bandLabel(nvl(score.getBandLabel(), "NEEDS_OPTIMIZATION"))
                .finalScore(score.getFinalEmployabilityScore().doubleValue())
                .careerDirectionScore(score.getCareerDirectionScore().doubleValue())
                .jobSearchScore(score.getJobSearchBehaviorScore().doubleValue())
                .readinessScore(score.getOpportunityReadinessScore().doubleValue())
                .flexibilityScore(score.getFlexibilityConstraintsScore().doubleValue())
                .improvementIntentScore(score.getImprovementIntentScore().doubleValue())
                .linkedinScore(score.getLinkedinScore().doubleValue())
                .linkedinHeadlineClarity(liInt(li, "headlineClarity"))
                .linkedinRoleClarity(liInt(li, "roleClarity"))
                .linkedinProfileCompleteness(liInt(li, "profileCompleteness"))
                .linkedinAboutQuality(liInt(li, "aboutQuality"))
                .linkedinExperiencePresentation(liInt(li, "experiencePresentation"))
                .linkedinProofOfWork(liInt(li, "proofOfWork"))
                .linkedinCertificationsSignal(liInt(li, "certifications"))
                .linkedinRecommendationSignal(liInt(li, "recommendations"))
                .linkedinActivityVisibility(liInt(li, "activityVisibility"))
                .linkedinCareerConsistency(liInt(li, "careerConsistency"))
                .linkedinGrowthProgression(liInt(li, "growthProgression"))
                .linkedinDifferentiationStrength(liInt(li, "differentiationStrength"))
                .linkedinRecruiterAttractiveness(liInt(li, "recruiterAttractiveness"))
                .linkedinTopStrengths(liStrengths)
                .linkedinTopConcernsList(liConcerns)
                .linkedinTopConcerns(concernsText)
                .diagnosticTags(tags)
                .linkedinIngestionMode(resolveIngestionMode(li))
                .linkedinDataAvailable(li != null && li.getIngestionMode() != null
                        && !LinkedInIngestionMode.FALLBACK.getCode().equals(li.getIngestionMode()))
                .build();
    }

    private LinkedInIngestionMode resolveIngestionMode(LinkedInAnalysisResult li) {
        if (li == null || li.getIngestionMode() == null) return LinkedInIngestionMode.URL_ONLY;
        for (LinkedInIngestionMode mode : LinkedInIngestionMode.values()) {
            if (mode.getCode().equals(li.getIngestionMode())) return mode;
        }
        return LinkedInIngestionMode.URL_ONLY;
    }

    private int liInt(LinkedInAnalysisResult li, String field) {
        if (li == null) return 5;
        return switch (field) {
            case "headlineClarity"        -> nvlInt(li.getHeadlineClarity());
            case "roleClarity"            -> nvlInt(li.getRoleClarity());
            case "profileCompleteness"    -> nvlInt(li.getProfileCompleteness());
            case "aboutQuality"           -> nvlInt(li.getAboutQuality());
            case "experiencePresentation" -> nvlInt(li.getExperiencePresentation());
            case "proofOfWork"            -> nvlInt(li.getProofOfWorkVisibility());
            case "certifications"         -> nvlInt(li.getCertificationsSignal());
            case "recommendations"        -> nvlInt(li.getRecommendationSignal());
            case "activityVisibility"     -> nvlInt(li.getActivityVisibility());
            case "careerConsistency"      -> nvlInt(li.getCareerConsistency());
            case "growthProgression"      -> nvlInt(li.getGrowthProgression());
            case "differentiationStrength"-> nvlInt(li.getDifferentiationStrength());
            case "recruiterAttractiveness"-> nvlInt(li.getRecruiterAttractiveness());
            default                       -> 5;
        };
    }

    // ─────────────────────────────────────────────────────────
    // Fallback: deterministic template-based report
    // Mirrors Prompt B tone rules: CRITICAL / NEEDS_OPTIMIZATION / STRONG
    // Produces all 10 required schema fields.
    // ─────────────────────────────────────────────────────────

    private Map<String, Object> buildFallbackReport(ReportPromptContext ctx) {
        String band   = ctx.getBandLabel();
        double score  = ctx.getFinalScore();
        String role   = ctx.getCurrentRole();
        String stage  = ctx.getCareerStage();

        String reportTitle = switch (band) {
            case "CRITICAL"           -> "Employability Risk Alert: " + role + " Diagnostic Report";
            case "NEEDS_OPTIMIZATION" -> "Employability Diagnostic: " + role + " — Optimization Required";
            default                   -> "Strong Employability Profile: " + role + " Diagnostic Report";
        };

        Map<String, Object> scoreSummary = buildScoreSummaryMap(ctx);

        String linkedinInsight = buildLinkedInInsight(ctx);
        String behavioralInsight = buildBehavioralInsight(ctx);
        List<Map<String, Object>> dimensionBreakdown = buildDimensionBreakdown(ctx);
        List<String> topGaps = buildTopGapStrings(ctx);
        String riskProjection = buildRiskProjection(ctx);
        String recommendation = buildRecommendation(ctx);
        String recruiterView  = buildRecruiterView(ctx);
        Map<String, Object> ctaBlock = buildCtaBlock(ctx);

        return Map.of(
                "reportTitle",         reportTitle,
                "scoreSummary",        scoreSummary,
                "linkedinInsight",     linkedinInsight,
                "behavioralInsight",   behavioralInsight,
                "dimensionBreakdown",  dimensionBreakdown,
                "topGaps",             topGaps,
                "riskProjection",      riskProjection,
                "recommendation",      recommendation,
                "recruiterViewInsight", recruiterView,
                "ctaBlock",            ctaBlock
        );
    }

    private Map<String, Object> buildScoreSummaryMap(ReportPromptContext ctx) {
        String tagline = switch (ctx.getBandLabel()) {
            case "CRITICAL" ->
                    "Your employability profile requires urgent attention across multiple dimensions.";
            case "NEEDS_OPTIMIZATION" ->
                    "You have the foundation — closing key gaps can meaningfully strengthen your position.";
            default ->
                    "A well-rounded profile with clear competitive strengths — precision targeting is the next lever.";
        };
        return Map.of(
                "employabilityScore", ctx.getFinalScore(),
                "bandLabel",          ctx.getBandLabel(),
                "tagline",            tagline
        );
    }

    private Map<String, Object> buildScoreSummaryMap(DiagnosticScore score) {
        String band = nvl(score.getBandLabel(), "NEEDS_OPTIMIZATION");
        String tagline = switch (band) {
            case "CRITICAL"           -> "Your employability profile requires urgent attention across multiple dimensions.";
            case "NEEDS_OPTIMIZATION" -> "You have the foundation — closing key gaps can meaningfully strengthen your position.";
            default                   -> "A well-rounded profile with clear competitive strengths — precision targeting is the next lever.";
        };
        return Map.of(
                "employabilityScore", score.getFinalEmployabilityScore(),
                "bandLabel",          band,
                "tagline",            tagline
        );
    }

    private String buildLinkedInInsight(ReportPromptContext ctx) {
        double liScore = ctx.getLinkedinScore();
        int completeness   = ctx.getLinkedinProfileCompleteness();
        int proofOfWork    = ctx.getLinkedinProofOfWork();
        int recruiterAttr  = ctx.getLinkedinRecruiterAttractiveness();

        if (liScore >= 7.5) {
            return String.format(
                    "Your LinkedIn profile scores %.1f/10, showing strong overall positioning. " +
                    "Profile completeness (%d/10) and recruiter attractiveness (%d/10) indicate solid visibility. " +
                    "Targeted keyword refinements and more consistent activity could further strengthen inbound reach.",
                    liScore, completeness, recruiterAttr);
        }
        if (liScore >= 5.0) {
            return String.format(
                    "Your LinkedIn presence scores %.1f/10 — functionally visible but with clear optimization headroom. " +
                    "Proof of work visibility (%d/10) and recruiter attractiveness (%d/10) are the primary gaps. " +
                    "Improving these two areas tends to produce the most immediate impact on inbound recruiter interest.",
                    liScore, proofOfWork, recruiterAttr);
        }
        return String.format(
                "Your LinkedIn profile scores %.1f/10, which significantly limits organic recruiter discoverability. " +
                "Profile completeness (%d/10) and proof of work (%d/10) are at critical levels. " +
                "Without addressing these, your profile is unlikely to surface in relevant recruiter searches.",
                liScore, completeness, proofOfWork);
    }

    private String buildBehavioralInsight(ReportPromptContext ctx) {
        double careerDir = ctx.getCareerDirectionScore();
        double jobSearch = ctx.getJobSearchScore();
        double intent    = ctx.getImprovementIntentScore();

        if (careerDir >= 7.0 && jobSearch >= 7.0) {
            return String.format(
                    "Career direction clarity (%.1f/10) and job search behavior (%.1f/10) are both strong signals. " +
                    "You have a clear target and are applying with consistency — two factors that correlate with shorter search cycles. " +
                    "Improvement intent at %.1f/10 suggests continued investment in development, which reinforces this profile.",
                    careerDir, jobSearch, intent);
        }
        if (careerDir < 5.0) {
            return String.format(
                    "Career direction scores %.1f/10, indicating limited role clarity. " +
                    "Without a well-defined target, job applications tend to be scattered, which reduces recruiter relevance signals. " +
                    "Defining a specific role target is typically the highest-leverage starting point for candidates at this stage.",
                    careerDir);
        }
        return String.format(
                "Job search behavior scores %.1f/10 — suggesting inconsistency in application volume or channel diversity. " +
                "Career direction at %.1f/10 shows some clarity, but execution patterns are limiting overall reach. " +
                "A more structured, multi-channel approach with consistent weekly targets tends to improve response rates significantly.",
                jobSearch, careerDir);
    }

    private List<Map<String, Object>> buildDimensionBreakdown(ReportPromptContext ctx) {
        return List.of(
                dim("Career Direction",         ctx.getCareerDirectionScore()),
                dim("Job Search Behavior",      ctx.getJobSearchScore()),
                dim("Opportunity Readiness",    ctx.getReadinessScore()),
                dim("Flexibility & Constraints",ctx.getFlexibilityScore()),
                dim("Improvement Intent",       ctx.getImprovementIntentScore()),
                dim("LinkedIn Presence",        ctx.getLinkedinScore())
        );
    }

    private Map<String, Object> dim(String area, double score) {
        String status = resolveStatus(score);
        String remark = buildDimensionRemark(area, score, status);
        return Map.of("area", area, "score", score, "status", status, "remark", remark);
    }

    private String resolveStatus(double score) {
        if (score >= 8.0) return "Strong";
        if (score >= 7.0) return "Good";
        if (score >= 5.0) return "Moderate";
        if (score >= 3.0) return "Needs Attention";
        return "Critical";
    }

    private String buildDimensionRemark(String area, double score, String status) {
        return switch (area) {
            case "Career Direction" -> switch (status) {
                case "Strong", "Good" ->
                        "Clear target role definition — applications are likely well-scoped and relevant.";
                case "Moderate"  ->
                        "Some role clarity, but narrowing focus further may improve recruiter response rates.";
                default ->
                        "Low career direction clarity is likely causing scattered applications and poor recruiter fit.";
            };
            case "Job Search Behavior" -> switch (status) {
                case "Strong", "Good" ->
                        "Consistent, multi-channel job search behavior — strong execution pattern.";
                case "Moderate"  ->
                        "Job search activity exists but lacks consistency or channel diversity.";
                default ->
                        "Job search behavior is at critical levels — insufficient application volume and reach.";
            };
            case "Opportunity Readiness" -> switch (status) {
                case "Strong", "Good" ->
                        "Interview-ready with quantified achievements and visible proof of work.";
                case "Moderate"  ->
                        "Partially prepared, but achievement documentation and portfolio visibility need strengthening.";
                default ->
                        "Significant readiness gaps — likely to struggle at interview or shortlisting stages.";
            };
            case "Flexibility & Constraints" -> switch (status) {
                case "Strong", "Good" ->
                        "Open to role types, locations, and formats — expands opportunity scope significantly.";
                case "Moderate"  ->
                        "Moderate flexibility — some constraints may limit accessible opportunities.";
                default ->
                        "Significant constraints are narrowing the accessible opportunity pool.";
            };
            case "Improvement Intent" -> switch (status) {
                case "Strong", "Good" ->
                        "High commitment to upskilling — consistent with profiles that close gaps faster.";
                case "Moderate"  ->
                        "Some improvement intent, but a structured skill development plan would strengthen outcomes.";
                default ->
                        "Low improvement intent may slow recovery in areas that require skill-building.";
            };
            case "LinkedIn Presence" -> switch (status) {
                case "Strong", "Good" ->
                        "LinkedIn profile signals strong professional branding and recruiter discoverability.";
                case "Moderate"  ->
                        "Visible but not optimized — headline, proof of work, and activity are key improvement areas.";
                default ->
                        "Critical LinkedIn gaps severely limit organic inbound interest from recruiters.";
            };
            default -> "Score of %.1f/10.".formatted(score);
        };
    }

    private List<String> buildTopGapStrings(ReportPromptContext ctx) {
        record ScoredDim(String name, double score) {}
        List<ScoredDim> dims = new ArrayList<>(List.of(
                new ScoredDim("Career Direction",          ctx.getCareerDirectionScore()),
                new ScoredDim("Job Search Behavior",       ctx.getJobSearchScore()),
                new ScoredDim("Opportunity Readiness",     ctx.getReadinessScore()),
                new ScoredDim("Flexibility & Constraints", ctx.getFlexibilityScore()),
                new ScoredDim("Improvement Intent",        ctx.getImprovementIntentScore()),
                new ScoredDim("LinkedIn Presence",         ctx.getLinkedinScore())
        ));
        dims.sort((a, b) -> Double.compare(a.score(), b.score()));

        List<String> gaps = new ArrayList<>();
        for (ScoredDim d : dims) {
            if (gaps.size() >= 3) break;
            gaps.add(buildGapSentence(d.name(), d.score()));
        }
        while (gaps.size() < 3) {
            gaps.add("Maintain consistency across all active job search channels and application quality.");
        }
        return gaps;
    }

    private String buildGapSentence(String area, double score) {
        return switch (area) {
            case "Career Direction" ->
                    String.format("Career Direction (%.1f/10): Define a specific target role to improve recruiter relevance and application conversion rates.", score);
            case "Job Search Behavior" ->
                    String.format("Job Search Behavior (%.1f/10): Increase weekly application volume and diversify across at least 3 active channels.", score);
            case "Opportunity Readiness" ->
                    String.format("Opportunity Readiness (%.1f/10): Strengthen interview preparation with quantified achievement stories and visible project portfolio.", score);
            case "Flexibility & Constraints" ->
                    String.format("Flexibility (%.1f/10): Evaluate whether current constraints can be relaxed to access a broader opportunity set.", score);
            case "Improvement Intent" ->
                    String.format("Improvement Intent (%.1f/10): Adopt a structured development plan — even one targeted course or project can signal commitment to hirers.", score);
            case "LinkedIn Presence" ->
                    String.format("LinkedIn Presence (%.1f/10): Prioritize profile completeness, a keyword-optimized headline, and at least one visible proof-of-work.", score);
            default ->
                    String.format("%s (%.1f/10): Address this dimension to improve overall employability standing.", area, score);
        };
    }

    private String buildRiskProjection(ReportPromptContext ctx) {
        return switch (ctx.getBandLabel()) {
            case "CRITICAL" ->
                    String.format(
                            "At %.1f/10, your profile is in the CRITICAL band — the highest-risk segment for prolonged job search duration. " +
                            "Candidates at this level typically face significantly higher rejection rates at shortlisting. " +
                            "Without targeted intervention across LinkedIn presence and career direction, the search cycle is likely to extend considerably.",
                            ctx.getFinalScore());
            case "NEEDS_OPTIMIZATION" ->
                    String.format(
                            "At %.1f/10 in the NEEDS_OPTIMIZATION band, you are likely experiencing inconsistent results — " +
                            "some callbacks but low conversion rates. " +
                            "The primary risk is stagnation: without closing the identified gaps, improvement plateaus. " +
                            "Targeted work on the two lowest-scoring dimensions has the highest probability of unlocking faster progress.",
                            ctx.getFinalScore());
            default ->
                    String.format(
                            "At %.1f/10 in the STRONG band, your core employability risk is competitive — not foundational. " +
                            "Your profile is already above the threshold where most shortlisting decisions are made. " +
                            "The remaining risk is differentiation: with many strong candidates in the market, precision targeting and narrative sharpness matter.",
                            ctx.getFinalScore());
        };
    }

    private String buildRecommendation(ReportPromptContext ctx) {
        List<String> lowest = twoLowestDimensions(ctx);
        return switch (ctx.getBandLabel()) {
            case "CRITICAL" ->
                    String.format(
                            "Immediate priority: address %s and %s — the two lowest-scoring dimensions in your profile. " +
                            "Start with LinkedIn profile overhaul (headline, proof of work, completeness) as it has the highest leverage-to-effort ratio. " +
                            "Simultaneously, define a specific target role and narrow applications to roles that match at least 70%% of your current skills. " +
                            "A structured 30-day recovery plan covering these areas can meaningfully shift your response rate trajectory.",
                            lowest.get(0), lowest.get(1));
            case "NEEDS_OPTIMIZATION" ->
                    String.format(
                            "Focus your next 30 days on closing gaps in %s and %s. " +
                            "For LinkedIn: update headline with target role keywords, add at least one quantified project or result. " +
                            "For job search: establish a consistent weekly rhythm of 15–20 targeted applications across at least 3 channels. " +
                            "These two changes tend to produce the clearest improvement in callback rates for candidates in this band.",
                            lowest.get(0), lowest.get(1));
            default ->
                    String.format(
                            "Your profile is strong — optimize for precision. " +
                            "Focus on %s as the next marginal improvement area. " +
                            "For LinkedIn: differentiation strength and activity visibility are your primary levers at this level. " +
                            "Invest in referral outreach and targeted applications to roles where you can leverage 3+ specific strengths. " +
                            "Interview preparation at this band should focus on senior-level narrative and quantified leadership impact.",
                            lowest.get(0));
        };
    }

    private String buildRecruiterView(ReportPromptContext ctx) {
        double liScore   = ctx.getLinkedinScore();
        double finalScore = ctx.getFinalScore();
        int recruiterAttr = ctx.getLinkedinRecruiterAttractiveness();
        int completeness  = ctx.getLinkedinProfileCompleteness();

        if (finalScore >= 7.5) {
            return String.format(
                    "A recruiter in the %s space reviewing this profile would likely shortlist it for relevant roles — " +
                    "LinkedIn attractiveness (%d/10) and profile completeness (%d/10) clear the basic threshold. " +
                    "The primary question for recruiters at this level is differentiation: what makes this candidate the specific choice over other strong profiles.",
                    ctx.getIndustry(), recruiterAttr, completeness);
        }
        if (finalScore >= 5.0) {
            return String.format(
                    "A recruiter reviewing this profile in the %s space would likely notice it but may hesitate at shortlisting. " +
                    "LinkedIn presence at %.1f/10 and profile completeness (%d/10) are below the threshold where most recruiters " +
                    "spontaneously reach out — active applications remain more effective than inbound at this level.",
                    ctx.getIndustry(), liScore, completeness);
        }
        return String.format(
                "At this profile strength level, recruiters in %s are unlikely to proactively shortlist or reach out. " +
                "LinkedIn attractiveness (%d/10) and overall score (%.1f/10) are below the organic discoverability threshold. " +
                "Outbound applications with a tailored message will significantly outperform passive visibility at this stage.",
                ctx.getIndustry(), recruiterAttr, finalScore);
    }

    private Map<String, Object> buildCtaBlock(ReportPromptContext ctx) {
        String headline = switch (ctx.getBandLabel()) {
            case "CRITICAL"           -> "Your Profile Needs Immediate Attention — Let's Build a Recovery Plan";
            case "NEEDS_OPTIMIZATION" -> "Close the Gaps Faster With a Targeted 1-on-1 Evaluation";
            default                   -> "Sharpen Your Competitive Edge With a Strategic Career Consultation";
        };
        String body = buildCtaBody(ctx.getFinalScore());
        return Map.of("headline", headline, "body", body, "buttonText", "Book Detailed Evaluation");
    }

    private String buildCtaBody(double score) {
        if (score < 5.0) {
            return "A structured consultation identifies your highest-leverage actions and builds a prioritized recovery plan. " +
                   "Candidates who work through a defined plan tend to see clearer traction within 4–6 weeks.";
        }
        if (score < 7.5) {
            return "A focused 1-on-1 session can map your specific gaps to actionable steps — and help you close them faster than a trial-and-error approach. " +
                   "Candidates in this band often see meaningful improvement in callback rates with targeted changes.";
        }
        return "A strategic consultation helps translate your strong profile into precision targeting — the right roles, with the right narrative. " +
               "At your level, small calibration changes can make the difference between a good outcome and the right outcome.";
    }

    private List<String> twoLowestDimensions(ReportPromptContext ctx) {
        record Dim(String name, double score) {}
        List<Dim> dims = new ArrayList<>(List.of(
                new Dim("Career Direction",       ctx.getCareerDirectionScore()),
                new Dim("Job Search Behavior",    ctx.getJobSearchScore()),
                new Dim("Opportunity Readiness",  ctx.getReadinessScore()),
                new Dim("Flexibility",            ctx.getFlexibilityScore()),
                new Dim("Improvement Intent",     ctx.getImprovementIntentScore()),
                new Dim("LinkedIn Presence",      ctx.getLinkedinScore())
        ));
        dims.sort((a, b) -> Double.compare(a.score(), b.score()));
        return List.of(dims.get(0).name(), dims.size() > 1 ? dims.get(1).name() : dims.get(0).name());
    }

    private List<String> parseTags(String tagsJson) {
        if (tagsJson == null || tagsJson.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(tagsJson, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[ReportGen] Failed to parse tags JSON: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<String> parseJsonStringList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[ReportGen] Failed to parse JSON string list: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<?, ?> safeMap(Object value) {
        if (value instanceof Map<?, ?> m) return m;
        return null;
    }

    private String str(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : "";
    }

    private String objStr(Map<?, ?> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : "";
    }

    private String nvl(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }

    private int nvlInt(Integer value) {
        return value != null ? value : 5;
    }

    private boolean isAuthError(String errorMessage) {
        if (errorMessage == null) return false;
        return errorMessage.contains("HTTP 401") || errorMessage.contains("HTTP 403");
    }

    private record AiGenerationResult(Map<String, Object> reportData, String rawResponse, int attempts, String failureReason) {}
}
