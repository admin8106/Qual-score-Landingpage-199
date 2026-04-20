package com.qualscore.qualcore.openai;

import com.qualscore.qualcore.openai.dto.ChatMessage;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Builds structured prompt message lists for each AI prompt in the system.
 *
 * ─────────────────────────────────────────────────────────
 * TWO-PROMPT AI ARCHITECTURE
 * ─────────────────────────────────────────────────────────
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  Prompt A — LinkedIn Analyzer                           │
 * │  Status: FUTURE-READY (currently rule-based)            │
 * │  Version: A-1.0                                         │
 * │  Input:  LinkedIn profile text (raw or enriched)        │
 * │  Output: 13 dimension scores + strengths/concerns JSON  │
 * │  Activate: Implement AiPromptLinkedInClient @Primary    │
 * └─────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  Prompt B — Final Diagnostic Report Generator           │
 * │  Status: ACTIVE (wired in ReportGenerationServiceImpl)  │
 * │  Version: See REPORT_PROMPT_VERSION constant below      │
 * │  Input:  All candidate signals (see ReportPromptContext) │
 * │  Output: Full diagnostic report as strict JSON          │
 * └─────────────────────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────
 * PROMPT VERSIONING SYSTEM
 * ─────────────────────────────────────────────────────────
 *
 * Every change to the content of Prompt B must increment REPORT_PROMPT_VERSION.
 * The version is persisted in diagnostic_reports.prompt_version for each report.
 * This allows future analysis of which prompt version produced which outputs
 * and enables safe A/B tuning without contaminating historical data.
 *
 * Versioning convention:
 *   B-1.0  = Baseline implementation
 *   B-1.x  = Minor tuning (tone, wording, guardrail additions)
 *   B-2.x  = Major schema changes (new fields, new sections)
 *
 * Process for safe prompt changes:
 *   1. Edit the prompt content below (system or user)
 *   2. Increment REPORT_PROMPT_VERSION
 *   3. Update the changelog comment in this file
 *   4. Run tests with mocked AI output to verify validator still passes
 *   5. Monitor FALLBACK_USED rate after deployment (spike = prompt regression)
 *
 * ─────────────────────────────────────────────────────────
 * PROMPT DESIGN PRINCIPLES (both A and B)
 * ─────────────────────────────────────────────────────────
 *
 * 1. System message must open with role definition followed by the hard
 *    constraint: "Respond ONLY with a valid JSON object."
 *
 * 2. Forbidden language — never allowed in any prompt or output:
 *    - Job/placement guarantees: "will get hired", "guaranteed shortlisting"
 *    - Salary promises: "higher salary", "better pay"
 *    - Outcome certainties: "will definitely", "100% success", "ensures"
 *    - Generic career advice: "work hard and succeed", "believe in yourself"
 *
 * 3. Every insight must be anchored to a specific numeric score or signal.
 *    No floating observations that could apply to any candidate.
 *
 * 4. Output size discipline:
 *    - Insight fields (linkedinInsight, behavioralInsight, etc.): 2–4 sentences max
 *    - remark in dimensionBreakdown: 1 sentence, score-specific
 *    - topGaps: 1 plain sentence per gap — no sub-bullets or objects
 *    - ctaBlock body: 2 sentences max
 *    - Total token budget: controlled by OPENAI_MAX_TOKENS env var (default 2000)
 *
 * 5. Temperature: 0.2 for reliable JSON structure with mild narrative variation.
 *    Do not raise above 0.3 — higher values produce inconsistent JSON structure.
 *
 * 6. Band-aware tone — strictly required:
 *    CRITICAL         = urgent, corrective, recovery-framed
 *    NEEDS_OPTIMIZATION = potential-focused, gap-aware, encouraging
 *    STRONG           = strategic, optimization-oriented, competitive
 *
 * ─────────────────────────────────────────────────────────
 * PROMPT B CHANGELOG
 * ─────────────────────────────────────────────────────────
 *
 * B-1.0 (2024-03) — Initial implementation.
 *   Basic system + user prompt pair. 10-field schema. Band-aware tone.
 *
 * B-1.1 (2024-03) — Production hardening.
 *   - Layered instruction hierarchy (ROLE → CONSTRAINT → TONE → SCHEMA → RULES)
 *   - Explicit forbidden-language block with exact banned phrases
 *   - Schema section uses numbered MUST-INCLUDE field list
 *   - Added output size discipline (sentence count limits per field)
 *   - Added completeness enforcement (all 6 dimensions required)
 *   - Strengthened topGaps validation instructions (exactly 3 plain strings)
 *   - buttonText now listed as a verbatim-required string
 *   - User prompt adds explicit "Return ONLY the JSON object" closing
 * ─────────────────────────────────────────────────────────
 */
@Service
public class PromptTemplateService {

    /**
     * Active prompt version for Prompt B (Report Generator).
     * Persisted in diagnostic_reports.prompt_version for every AI-generated report.
     * INCREMENT THIS CONSTANT when changing any prompt content below.
     */
    public static final String REPORT_PROMPT_VERSION = "B-1.1";

    /**
     * Prompt version for Prompt A (LinkedIn Analyzer).
     * Currently unused at runtime (rule-based), but tracked for future activation.
     */
    public static final String LINKEDIN_PROMPT_VERSION = "A-1.0";

    // ─────────────────────────────────────────────────────────
    // PROMPT A — LinkedIn Analyzer (FUTURE-READY)
    // ─────────────────────────────────────────────────────────

    /**
     * Builds the prompt for LinkedIn profile analysis.
     *
     * Activate by implementing AiPromptLinkedInClient marked @Primary.
     * RuleBasedLinkedInAnalysisClient remains the current @Primary implementation.
     */
    public List<ChatMessage> buildLinkedInAnalysisPrompt(
            String linkedInProfileText,
            String currentRole,
            String careerStage,
            String industryContext) {

        String systemPrompt = """
                ROLE: You are an expert career analyst and LinkedIn profile evaluator.

                HARD CONSTRAINT: Respond ONLY with a valid JSON object.
                Do not include any explanation, markdown formatting, code fences, preamble, or prose outside the JSON.

                FORBIDDEN: Never use language that guarantees employment, promises salary outcomes,
                or claims certifications will ensure hiring. Use analytical, evidence-based language only.

                OUTPUT SCHEMA — return exactly these fields:
                  headlineClarity          (integer 1-10)
                  roleClarity              (integer 1-10)
                  profileCompleteness      (integer 1-10)
                  aboutQuality             (integer 1-10)
                  experiencePresentation   (integer 1-10)
                  proofOfWorkVisibility    (integer 1-10)
                  certificationsSignal     (integer 1-10)
                  recommendationSignal     (integer 1-10)
                  activityVisibility       (integer 1-10)
                  careerConsistency        (integer 1-10)
                  growthProgression        (integer 1-10)
                  differentiationStrength  (integer 1-10)
                  recruiterAttractiveness  (integer 1-10)
                  summaryNotes             (array of up to 3 strings)
                  topStrengths             (array of up to 3 strings)
                  topConcerns              (array of up to 3 strings)

                SCORING RUBRIC: 1-3 = Weak/Missing, 4-6 = Average/Partial, 7-9 = Good/Complete, 10 = Excellent.

                All string values in summaryNotes, topStrengths, topConcerns must reference specific
                observable signals from the profile — not generic career advice.
                """;

        String userPrompt = """
                Evaluate the LinkedIn profile for a %s candidate in the %s industry. Target role: %s.

                LinkedIn Profile:
                %s

                Return ONLY a valid JSON object matching the schema above. No other text.
                """.formatted(careerStage, industryContext, currentRole, linkedInProfileText);

        return List.of(ChatMessage.system(systemPrompt), ChatMessage.user(userPrompt));
    }

    // ─────────────────────────────────────────────────────────
    // PROMPT B — Final Diagnostic Report Generator (ACTIVE)
    // ─────────────────────────────────────────────────────────

    /**
     * Builds the prompt for final employability diagnostic report generation.
     *
     * Output schema (all 10 fields required, none optional):
     * <pre>
     * {
     *   "reportTitle": string,
     *   "scoreSummary": {
     *     "employabilityScore": number (1 decimal),
     *     "bandLabel": string ("CRITICAL"|"NEEDS_OPTIMIZATION"|"STRONG"),
     *     "tagline": string (1 punchy sentence, candidate-specific)
     *   },
     *   "linkedinInsight": string (2–4 sentences referencing specific LinkedIn scores),
     *   "behavioralInsight": string (2–4 sentences referencing career direction and job search scores),
     *   "dimensionBreakdown": [
     *     { "area": string, "score": number, "status": string, "remark": string } × EXACTLY 6
     *   ],
     *   "topGaps": [string, string, string],  // EXACTLY 3 plain strings
     *   "riskProjection": string (2–3 sentences, score-anchored),
     *   "recommendation": string (3–4 sentences, names weakest dimensions explicitly),
     *   "recruiterViewInsight": string (2–3 sentences, industry-specific),
     *   "ctaBlock": {
     *     "headline": string,
     *     "body": string (2 sentences max),
     *     "buttonText": "Book Detailed Evaluation"  // verbatim — do not change
     *   }
     * }
     * </pre>
     *
     * Current version: {@link #REPORT_PROMPT_VERSION}
     */
    public List<ChatMessage> buildReportGenerationPrompt(ReportPromptContext ctx) {
        String toneInstruction = buildToneInstruction(ctx);
        String systemPrompt = buildReportSystemPrompt(toneInstruction);
        String userPrompt   = buildReportUserPrompt(ctx);
        return List.of(ChatMessage.system(systemPrompt), ChatMessage.user(userPrompt));
    }

    private String buildToneInstruction(ReportPromptContext ctx) {
        return switch (ctx.getBandLabel()) {
            case "CRITICAL" -> """
                    TONE — CRITICAL BAND (score < 5.0):
                    The candidate is at significant employability risk. Be urgent and corrective.
                    Prioritize clarity about what needs to change immediately.
                    Be direct and honest — do not soften findings to the point of being misleading.
                    Do NOT be discouraging — frame everything around recovery pathways and specific actions.
                    Required phrasing register: "requires immediate attention", "critical gap", "priority action", "recovery plan".
                    Avoid: "you will succeed", "great potential", vague encouragement without data backing.
                    """;
            case "NEEDS_OPTIMIZATION" -> """
                    TONE — NEEDS_OPTIMIZATION BAND (score 5.0–7.4):
                    The candidate has a foundation but clear blockers remain. Be potential-focused with honest gap awareness.
                    Acknowledge progress while being specific about what is holding them back.
                    Be encouraging without being dismissive of real gaps.
                    Required phrasing register: "strong potential", "targeted improvement", "closing the gap", "build on this".
                    Avoid: false urgency ("critical risk"), false optimism ("nearly there"), generic advice.
                    """;
            default -> """
                    TONE — STRONG BAND (score 7.5+):
                    The candidate has a strong employability foundation. Be strategic and optimization-oriented.
                    Focus on differentiation, competitive positioning, and precision targeting.
                    The work at this level is refinement, not repair.
                    Required phrasing register: "well-positioned", "competitive advantage", "optimize for", "precision targeting".
                    Avoid: corrective or urgent framing, implying foundational problems that don't exist.
                    """;
        };
    }

    private String buildReportSystemPrompt(String toneInstruction) {
        return """
                ═══════════════════════════════════════════════════════════
                ROLE
                ═══════════════════════════════════════════════════════════
                You are a senior employability analyst generating a precise, data-driven diagnostic report.
                Your output is consumed directly by a production system — not read by a human before use.

                ═══════════════════════════════════════════════════════════
                HARD OUTPUT CONSTRAINT — READ FIRST
                ═══════════════════════════════════════════════════════════
                Respond ONLY with a valid JSON object.
                Do NOT include any text before or after the JSON.
                Do NOT wrap the JSON in markdown code fences (``` or ```json).
                Do NOT include explanations, apologies, preamble, or meta-commentary.
                The response must begin with { and end with }.
                Any deviation from this causes a system failure.

                ═══════════════════════════════════════════════════════════
                FORBIDDEN LANGUAGE — NEVER USE THESE
                ═══════════════════════════════════════════════════════════
                The following phrases and concepts are strictly prohibited in any field:
                - "guaranteed", "will guarantee", "guarantee you"
                - "will get hired", "will get a job", "ensure you get hired"
                - "will definitely", "will certainly", "100%% success"
                - "placement", "job placement", "place you"
                - "promise", "we promise"
                - "ensure a higher salary", "better salary guaranteed"
                - Generic advice: "work hard and succeed", "believe in yourself", "stay positive"
                - Vague phrases without data: "great career ahead", "bright future"
                Any response containing these phrases will be rejected.

                ═══════════════════════════════════════════════════════════
                TONE REQUIREMENT
                ═══════════════════════════════════════════════════════════
                %s

                ═══════════════════════════════════════════════════════════
                REQUIRED OUTPUT SCHEMA — ALL 10 FIELDS MUST BE PRESENT
                ═══════════════════════════════════════════════════════════

                1. "reportTitle" (string)
                   A specific, personalized title referencing the candidate's role and industry.
                   Not generic. Must be different for every candidate.
                   Example: "Employability Diagnostic: Senior Analyst, FinTech — Critical Band Alert"

                2. "scoreSummary" (object — all 3 sub-fields required)
                   {
                     "employabilityScore": number with 1 decimal place (copy from input — do not recalculate),
                     "bandLabel": string — must be exactly one of: "CRITICAL", "NEEDS_OPTIMIZATION", "STRONG",
                     "tagline": string — 1 punchy sentence that characterizes THIS candidate's situation.
                                Must reference at least one specific dimension or score.
                                Must NOT be a generic phrase applicable to any candidate.
                   }

                3. "linkedinInsight" (string — 2 to 4 sentences)
                   Must reference at least 2 specific LinkedIn dimension scores by name and numeric value.
                   Must explain what these scores mean for this candidate's recruiter visibility.
                   Must NOT be generic observations applicable to any profile.

                4. "behavioralInsight" (string — 2 to 4 sentences)
                   Must reference the Career Direction and Job Search Behavior scores by numeric value.
                   Must explain what these patterns mean for this candidate's search outcomes.

                5. "dimensionBreakdown" (array — EXACTLY 6 objects, in this EXACT order)
                   Sequence: Career Direction, Job Search Behavior, Opportunity Readiness,
                             Flexibility & Constraints, Improvement Intent, LinkedIn Presence
                   Each object must have all 4 fields:
                   {
                     "area": string (exact name from the sequence above),
                     "score": number (copy from input — do not recalculate),
                     "status": string — must be one of: "Strong" (score ≥ 8.0), "Good" (7.0–7.9),
                               "Moderate" (5.0–6.9), "Needs Attention" (3.0–4.9), "Critical" (< 3.0),
                     "remark": string — exactly 1 sentence. Must be score-specific to this candidate.
                               Must NOT be a generic observation applicable to all candidates.
                   }
                   Do NOT add, remove, or reorder dimensions. Exactly 6, in the listed order.

                6. "topGaps" (array — EXACTLY 3 strings)
                   Each element must be a plain sentence string. No objects. No sub-fields.
                   Order: most impactful gap first.
                   Each sentence must name the specific dimension and its score.
                   Do NOT include bullet formatting or numbered prefixes inside the string.

                7. "riskProjection" (string — 2 to 3 sentences)
                   Must reference the specific score band and the actual numeric final score.
                   Must name at least 1 lowest-scoring dimension by name.
                   Must be forward-looking risk framing — not a repeat of the insight fields.

                8. "recommendation" (string — 3 to 4 sentences)
                   Must name the 2 weakest dimensions explicitly by name.
                   Must include concrete, specific action steps — not generic career advice.
                   Must NOT suggest actions that contradict the score band tone.

                9. "recruiterViewInsight" (string — 2 to 3 sentences)
                   Must name the candidate's industry.
                   Must reference recruiter attractiveness score or LinkedIn score numerically.
                   Must describe the recruiter's likely decision outcome (shortlist / hesitate / skip).

                10. "ctaBlock" (object — all 3 sub-fields required)
                    {
                      "headline": string (direct, benefit-focused CTA headline — band-appropriate),
                      "body": string (MAXIMUM 2 sentences — outcome-focused, no guarantees),
                      "buttonText": "Book Detailed Evaluation"  (verbatim — this exact string, always)
                    }

                ═══════════════════════════════════════════════════════════
                QUALITY RULES
                ═══════════════════════════════════════════════════════════
                - Use actual scores from the input. Do NOT invent or recalculate scores.
                - Do NOT repeat the same observation in multiple fields.
                - Keep paragraphs concise — 2–4 sentences max per insight field.
                - Every remark in dimensionBreakdown must be different for each dimension.
                - topGaps must represent the 3 lowest-scoring dimensions — not randomly chosen.
                - The tagline in scoreSummary must be distinct from the reportTitle.
                """.formatted(toneInstruction);
    }

    private String buildReportUserPrompt(ReportPromptContext ctx) {
        String strengths = (ctx.getLinkedinTopStrengths() != null && !ctx.getLinkedinTopStrengths().isEmpty())
                ? String.join(", ", ctx.getLinkedinTopStrengths())
                : "Not available";

        String concerns = (ctx.getLinkedinTopConcernsList() != null && !ctx.getLinkedinTopConcernsList().isEmpty())
                ? String.join(", ", ctx.getLinkedinTopConcernsList())
                : (ctx.getLinkedinTopConcerns() != null ? ctx.getLinkedinTopConcerns() : "Not available");

        String tags = (ctx.getDiagnosticTags() != null && !ctx.getDiagnosticTags().isEmpty())
                ? String.join(", ", ctx.getDiagnosticTags())
                : "None";

        String linkedinDataNote = buildLinkedInDataQualityNote(ctx);

        return """
                Generate the employability diagnostic report for this candidate.
                Use ONLY the data below. Do not invent scores or signals.

                ── CANDIDATE PROFILE ──────────────────────────────────────
                Name:              %s
                Career Stage:      %s
                Industry:          %s
                Current/Target Role: %s
                Total Experience:  %s years
                Diagnostic Tags:   %s

                ── EMPLOYABILITY SCORES (1–10 scale) ─────────────────────
                Final Employability Score: %.1f  [Band: %s]
                ├─ Career Direction:         %.1f
                ├─ Job Search Behavior:      %.1f
                ├─ Opportunity Readiness:    %.1f
                ├─ Flexibility/Constraints:  %.1f
                ├─ Improvement Intent:       %.1f
                └─ LinkedIn Presence:        %.1f

                ── LINKEDIN DIMENSION SCORES (1–10 scale) ─────────────────
                Data Quality: %s
                ├─ Headline Clarity:          %d
                ├─ Role Clarity:              %d
                ├─ Profile Completeness:      %d
                ├─ About Quality:             %d
                ├─ Experience Presentation:   %d
                ├─ Proof of Work Visibility:  %d
                ├─ Certifications Signal:     %d
                ├─ Recommendation Signal:     %d
                ├─ Activity Visibility:       %d
                ├─ Career Consistency:        %d
                ├─ Growth Progression:        %d
                ├─ Differentiation Strength:  %d
                └─ Recruiter Attractiveness:  %d

                LinkedIn Top Strengths: %s
                LinkedIn Top Concerns:  %s

                ── LINKEDIN DATA QUALITY INSTRUCTION ──────────────────────
                %s

                ── INSTRUCTION ────────────────────────────────────────────
                Return ONLY a valid JSON object matching the exact schema in the system instructions.
                All 10 top-level fields are required. Begin your response with { and end with }.
                """.formatted(
                        ctx.getCandidateName(),
                        formatCareerStage(ctx.getCareerStage()),
                        ctx.getIndustry(),
                        ctx.getCurrentRole(),
                        ctx.getExperienceYears(),
                        tags,
                        ctx.getFinalScore(), ctx.getBandLabel(),
                        ctx.getCareerDirectionScore(),
                        ctx.getJobSearchScore(),
                        ctx.getReadinessScore(),
                        ctx.getFlexibilityScore(),
                        ctx.getImprovementIntentScore(),
                        ctx.getLinkedinScore(),
                        ctx.getLinkedinIngestionMode() != null
                                ? ctx.getLinkedinIngestionMode().getLabel() + " — " + ctx.getLinkedinIngestionMode().getDescription()
                                : "URL Only — scores inferred from form data",
                        ctx.getLinkedinHeadlineClarity(),
                        ctx.getLinkedinRoleClarity(),
                        ctx.getLinkedinProfileCompleteness(),
                        ctx.getLinkedinAboutQuality(),
                        ctx.getLinkedinExperiencePresentation(),
                        ctx.getLinkedinProofOfWork(),
                        ctx.getLinkedinCertificationsSignal(),
                        ctx.getLinkedinRecommendationSignal(),
                        ctx.getLinkedinActivityVisibility(),
                        ctx.getLinkedinCareerConsistency(),
                        ctx.getLinkedinGrowthProgression(),
                        ctx.getLinkedinDifferentiationStrength(),
                        ctx.getLinkedinRecruiterAttractiveness(),
                        strengths,
                        concerns,
                        linkedinDataNote
                );
    }

    private String buildLinkedInDataQualityNote(ReportPromptContext ctx) {
        if (ctx.getLinkedinIngestionMode() == null) {
            return "LinkedIn scores are inferred from candidate form data only. " +
                   "In linkedinInsight, note that this analysis is based on self-reported data and has limited certainty.";
        }
        return switch (ctx.getLinkedinIngestionMode()) {
            case URL_ONLY ->
                    "LinkedIn scores are inferred from candidate form data (role, stage, industry, experience) only. " +
                    "No actual LinkedIn profile content was read. " +
                    "In the linkedinInsight field, you MUST include a brief acknowledgment such as: " +
                    "'Note: This LinkedIn analysis is based on form-submitted data and has limited certainty — " +
                    "direct profile review would provide a more precise assessment.' " +
                    "Do NOT present these scores as if they come from reading the actual profile.";
            case CANDIDATE_TEXT ->
                    "LinkedIn scores incorporate candidate-provided profile text (About section and/or experience). " +
                    "This is a PARTIAL analysis — not all profile signals are available. " +
                    "In linkedinInsight, you may reference the submitted text-based signals directly. " +
                    "Include a brief note that the analysis is based on candidate-provided content.";
            case ENRICHED ->
                    "LinkedIn scores are from a fully enriched profile data source. " +
                    "All 13 dimension scores reflect real profile signals. " +
                    "In linkedinInsight, present these scores with full confidence — no qualification needed.";
            case FALLBACK ->
                    "No LinkedIn data was available for this candidate. " +
                    "All LinkedIn dimension scores are neutral baselines (5/10). " +
                    "In linkedinInsight, explicitly state: 'LinkedIn profile data was not available for this analysis — " +
                    "scores reflect a neutral baseline. Reviewing and optimizing the LinkedIn profile is recommended as a priority action.' " +
                    "Do NOT fabricate observations about the profile.";
        };
    }

    private String formatCareerStage(String rawStage) {
        if (rawStage == null) return "Professional";
        return switch (rawStage) {
            case "FRESHER"              -> "Fresher (0–1 years experience)";
            case "WORKING_PROFESSIONAL" -> "Working Professional";
            default                     -> rawStage;
        };
    }
}
