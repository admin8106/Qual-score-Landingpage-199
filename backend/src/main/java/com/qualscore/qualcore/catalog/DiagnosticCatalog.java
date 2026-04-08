package com.qualscore.qualcore.catalog;

import com.qualscore.qualcore.constants.DiagnosticConstants;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class DiagnosticCatalog {

    private final Map<String, QuestionMaster> questionsByCode;

    public DiagnosticCatalog() {
        questionsByCode = buildCatalog();
    }

    public List<QuestionMaster> getAllQuestions() {
        return List.copyOf(questionsByCode.values());
    }

    public Optional<QuestionMaster> findByCode(String code) {
        return Optional.ofNullable(questionsByCode.get(code));
    }

    public Map<String, QuestionMaster> getQuestionsByCode() {
        return Map.copyOf(questionsByCode);
    }

    private Map<String, QuestionMaster> buildCatalog() {
        Map<String, QuestionMaster> catalog = new LinkedHashMap<>();

        catalog.put("Q01", QuestionMaster.builder()
                .code("Q01").sequence(1)
                .sectionCode(DiagnosticConstants.SECTION_CAREER_DIRECTION)
                .sectionLabel("Career Direction")
                .text("Which role are you actively targeting right now?")
                .options(List.of(
                        opt("same_role",    "Same as my current or most recent role",           10),
                        opt("advanced_role","A slightly advanced version of my current role",   7),
                        opt("different_role","A different role within the same domain",         4),
                        opt("exploring",   "I am still exploring multiple unrelated roles",     1)
                )).build());

        catalog.put("Q02", QuestionMaster.builder()
                .code("Q02").sequence(2)
                .sectionCode(DiagnosticConstants.SECTION_CAREER_DIRECTION)
                .sectionLabel("Career Direction")
                .text("Which best describes your current job search goal?")
                .options(List.of(
                        opt("urgent",  "I am urgently looking for a job",                           10),
                        opt("growth",  "I am looking for better growth opportunities",               7),
                        opt("casual",  "I am exploring the market casually",                         4),
                        opt("passive", "I am not actively searching, only checking my standing",     1)
                )).build());

        catalog.put("Q03", QuestionMaster.builder()
                .code("Q03").sequence(3)
                .sectionCode(DiagnosticConstants.SECTION_CAREER_DIRECTION)
                .sectionLabel("Career Direction")
                .text("What do you think is the biggest reason you are not getting enough interview calls?")
                .options(List.of(
                        opt("profile_weak",   "My profile is not positioned strongly enough",        10),
                        opt("skills_gap",     "My skills may not match market demand well enough",   7),
                        opt("low_visibility", "My visibility and recruiter reach are low",           7),
                        opt("unsure",         "I am not sure what the exact issue is",              1)
                )).build());

        catalog.put("Q04", QuestionMaster.builder()
                .code("Q04").sequence(4)
                .sectionCode(DiagnosticConstants.SECTION_JOB_SEARCH)
                .sectionLabel("Job Search Behavior")
                .text("On average, how many relevant jobs do you apply to in a week?")
                .options(List.of(
                        opt("15_plus", "15 or more",  10),
                        opt("8_to_14", "8 to 14",      7),
                        opt("3_to_7",  "3 to 7",       4),
                        opt("0_to_2",  "0 to 2",       1)
                )).build());

        catalog.put("Q05", QuestionMaster.builder()
                .code("Q05").sequence(5)
                .sectionCode(DiagnosticConstants.SECTION_JOB_SEARCH)
                .sectionLabel("Job Search Behavior")
                .text("How do you usually apply for opportunities?")
                .options(List.of(
                        opt("both_channels", "Through both job portals and networking/referrals", 10),
                        opt("portals_only",  "Mostly through LinkedIn or job portals",           7),
                        opt("referrals_only","Mostly through referrals or personal contacts only",4),
                        opt("inconsistent",  "I apply inconsistently without a fixed approach",  1)
                )).build());

        catalog.put("Q06", QuestionMaster.builder()
                .code("Q06").sequence(6)
                .sectionCode(DiagnosticConstants.SECTION_JOB_SEARCH)
                .sectionLabel("Job Search Behavior")
                .text("After applying for a role, what do you usually do next?")
                .options(List.of(
                        opt("consistent_followup","I follow up or try to connect with recruiters consistently",10),
                        opt("selective_followup", "I track applications and follow up selectively",           7),
                        opt("wait",               "I usually wait for a response",                           4),
                        opt("nothing",            "I usually do nothing further",                            1)
                )).build());

        catalog.put("Q07", QuestionMaster.builder()
                .code("Q07").sequence(7)
                .sectionCode(DiagnosticConstants.SECTION_OPPORTUNITY_READINESS)
                .sectionLabel("Opportunity Readiness")
                .text("If you get shortlisted tomorrow, how prepared are you for interviews?")
                .options(List.of(
                        opt("fully_ready",  "Fully ready",                                        10),
                        opt("mostly_ready", "Mostly ready, with slight preparation needed",       7),
                        opt("needs_prep",   "I need significant preparation",                     4),
                        opt("not_ready",    "I am not ready at all",                              1)
                )).build());

        catalog.put("Q08", QuestionMaster.builder()
                .code("Q08").sequence(8)
                .sectionCode(DiagnosticConstants.SECTION_OPPORTUNITY_READINESS)
                .sectionLabel("Opportunity Readiness")
                .text("Which best describes your proof of work beyond LinkedIn?")
                .options(List.of(
                        opt("strong_proof",  "Strong portfolio, projects, or measurable achievements",    10),
                        opt("partial_proof", "Some visible proof exists, but it is not well organized",   7),
                        opt("limited_proof", "I have limited proof of work",                              4),
                        opt("no_proof",      "I do not have strong proof available",                      1)
                )).build());

        catalog.put("Q09", QuestionMaster.builder()
                .code("Q09").sequence(9)
                .sectionCode(DiagnosticConstants.SECTION_OPPORTUNITY_READINESS)
                .sectionLabel("Opportunity Readiness")
                .text("How clearly can you explain your work impact in interviews?")
                .options(List.of(
                        opt("very_clearly",   "Very clearly, with examples and measurable impact", 10),
                        opt("fairly_clearly", "Fairly clearly",                                    7),
                        opt("basic_level",    "Only at a basic level",                             4),
                        opt("struggle",       "I struggle to explain it confidently",              1)
                )).build());

        catalog.put("Q10", QuestionMaster.builder()
                .code("Q10").sequence(10)
                .sectionCode(DiagnosticConstants.SECTION_FLEXIBILITY)
                .sectionLabel("Flexibility & Constraints")
                .text("Which work setup are you open to?")
                .options(List.of(
                        opt("all_setups",    "Open to on-site, hybrid, and remote",   10),
                        opt("hybrid_remote", "Open to hybrid and remote only",         7),
                        opt("onsite_only",   "Open to on-site only",                  4),
                        opt("restricted",    "I have very restricted preferences",     1)
                )).build());

        catalog.put("Q11", QuestionMaster.builder()
                .code("Q11").sequence(11)
                .sectionCode(DiagnosticConstants.SECTION_FLEXIBILITY)
                .sectionLabel("Flexibility & Constraints")
                .text("Are you open to changing city or location for the right opportunity?")
                .options(List.of(
                        opt("yes_relocate",   "Yes",                                           10),
                        opt("maybe_relocate", "Maybe, depending on the role",                  7),
                        opt("local_only",     "Only within my current city or region",         4),
                        opt("no_relocate",    "No",                                            1)
                )).build());

        catalog.put("Q12", QuestionMaster.builder()
                .code("Q12").sequence(12)
                .sectionCode(DiagnosticConstants.SECTION_FLEXIBILITY)
                .sectionLabel("Flexibility & Constraints")
                .text("Which best describes your salary expectation right now?")
                .options(List.of(
                        opt("realistic",         "It is realistic for my profile and current market",            10),
                        opt("slightly_ambitious","It is slightly ambitious but still reasonable",                 7),
                        opt("unsure_salary",     "I am not sure what is realistic",                              4),
                        opt("too_high",          "It may be higher than what the market would currently support", 1)
                )).build());

        catalog.put("Q13", QuestionMaster.builder()
                .code("Q13").sequence(13)
                .sectionCode(DiagnosticConstants.SECTION_IMPROVEMENT_INTENT)
                .sectionLabel("Improvement Intent")
                .text("Which area do you believe needs the most improvement for better shortlisting?")
                .options(List.of(
                        opt("profile_positioning","Profile positioning and presentation",       10),
                        opt("skills_alignment",   "Skills and role alignment",                  7),
                        opt("interview_readiness","Interview readiness and confidence",          7),
                        opt("unsure_gap",         "I am not sure what exactly needs improvement",1)
                )).build());

        catalog.put("Q14", QuestionMaster.builder()
                .code("Q14").sequence(14)
                .sectionCode(DiagnosticConstants.SECTION_IMPROVEMENT_INTENT)
                .sectionLabel("Improvement Intent")
                .text("How actively are you working on improving your employability right now?")
                .options(List.of(
                        opt("very_actively",    "Very actively and consistently", 10),
                        opt("somewhat_actively","Somewhat actively",               7),
                        opt("occasionally",     "Occasionally",                   4),
                        opt("hardly",           "Hardly at all",                  1)
                )).build());

        catalog.put("Q15", QuestionMaster.builder()
                .code("Q15").sequence(15)
                .sectionCode(DiagnosticConstants.SECTION_IMPROVEMENT_INTENT)
                .sectionLabel("Improvement Intent")
                .text("If your diagnostic report shows clear gaps, what are you most likely to do next?")
                .options(List.of(
                        opt("book_eval",   "Book a detailed evaluation and work on improvement",    10),
                        opt("study_first", "Study the gaps first and then decide",                  7),
                        opt("self_fix",    "Try to fix things on my own without further support",   4),
                        opt("do_nothing",  "Probably do nothing immediately",                       1)
                )).build());

        return catalog;
    }

    private static QuestionOption opt(String code, String label, int score) {
        return QuestionOption.builder().code(code).label(label).score(score).build();
    }
}
