package com.qualscore.qualcore.email;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Renders email templates into polished HTML and plain-text bodies.
 *
 * Strategy:
 *   - Each supported template code has a dedicated HTML builder method that
 *     produces a fully-branded, responsive email using inline styles.
 *   - The plain-text body is produced by stripping the pre-rendered text
 *     template (from NotificationTemplateRegistry) with token substitution.
 *   - Unknown template codes fall back to a generic single-column layout
 *     wrapping the rendered plain-text body.
 *
 * Design principles:
 *   - Inline CSS only (email client compatibility)
 *   - Max width 600px, system font stack
 *   - Brand colours: #1a1a2e (header), #0f3460 (primary), #e94560 (accent)
 *   - Mobile-friendly: single-column, large tap targets
 */
@Component
public class EmailTemplateRenderer {

    private static final String BRAND_DARK   = "#1a1a2e";
    private static final String BRAND_BLUE   = "#0f3460";
    private static final String BRAND_ACCENT = "#e94560";
    private static final String BRAND_LIGHT  = "#f8f9fa";
    private static final String TEXT_DARK    = "#1a1a2e";
    private static final String TEXT_MUTED   = "#6b7280";

    public String renderHtml(String templateCode, Map<String, String> params) {
        return switch (templateCode) {
            case "EMAIL_REPORT_READY"            -> renderReportReady(params);
            case "EMAIL_PROFILE_NOT_SHORTLISTED" -> renderProfileNotShortlisted(params);
            case "EMAIL_CONSULTATION_URGENCY"    -> renderConsultationUrgency(params);
            case "EMAIL_BOOKING_CONFIRMED"       -> renderBookingConfirmed(params);
            default                              -> renderGeneric(params);
        };
    }

    public String renderText(String rawTemplate, Map<String, String> params) {
        if (rawTemplate == null) return "";
        String result = rawTemplate;
        if (params != null) {
            for (Map.Entry<String, String> entry : params.entrySet()) {
                result = result.replace("[" + entry.getKey() + "]",
                        entry.getValue() != null ? entry.getValue() : "");
            }
        }
        return result;
    }

    private String renderReportReady(Map<String, String> p) {
        String name       = get(p, "NAME", "there");
        String score      = get(p, "SCORE", "—");
        String band       = get(p, "BAND", "");
        String reportLink = get(p, "REPORT_LINK", "#");

        String bandBadge = band.isBlank() ? "" :
                "<span style=\"background:" + bandColor(band) + ";color:#fff;" +
                "padding:3px 10px;border-radius:12px;font-size:13px;font-weight:600;\">" +
                band + "</span>";

        return wrap(
            "Your Employability Diagnostic Report is Ready",
            """
            <p style="font-size:16px;color:%s;margin:0 0 16px;">Hi %s,</p>
            <p style="font-size:15px;color:%s;margin:0 0 24px;line-height:1.6;">
              Your <strong>Employability Diagnostic Report</strong> is now ready.
              Here's your overall result:
            </p>
            <div style="background:%s;border-radius:12px;padding:28px;text-align:center;margin:0 0 28px;">
              <p style="margin:0 0 8px;font-size:14px;color:%s;text-transform:uppercase;letter-spacing:1px;">
                Your Employability Score
              </p>
              <p style="margin:0 0 12px;font-size:52px;font-weight:700;color:%s;line-height:1;">
                %s<span style="font-size:24px;color:%s;">/10</span>
              </p>
              %s
            </div>
            <p style="font-size:15px;color:%s;margin:0 0 8px;line-height:1.6;">
              We've identified the key factors currently affecting your shortlisting rate.
              Your full report breaks these down with specific, actionable guidance.
            </p>
            <p style="font-size:15px;color:%s;margin:0 0 28px;line-height:1.6;">
              Understanding your gaps is the first step to fixing them.
            </p>
            %s
            <p style="font-size:13px;color:%s;margin:32px 0 0;">
              Questions? Reply to this email and our team will get back to you.
            </p>
            """.formatted(
                TEXT_DARK, name,
                TEXT_DARK,
                BRAND_LIGHT,
                TEXT_MUTED,
                BRAND_BLUE,
                score, TEXT_MUTED,
                bandBadge,
                TEXT_DARK,
                TEXT_DARK,
                ctaButton("View Your Full Report", reportLink),
                TEXT_MUTED
            )
        );
    }

    private String renderProfileNotShortlisted(Map<String, String> p) {
        String name             = get(p, "NAME", "there");
        String score            = get(p, "SCORE", "—");
        String consultationLink = get(p, "CONSULTATION_LINK", "#");

        return wrap(
            "Why Your Profile May Not Be Getting Shortlisted",
            """
            <p style="font-size:16px;color:%s;margin:0 0 16px;">Hi %s,</p>
            <p style="font-size:15px;color:%s;margin:0 0 20px;line-height:1.6;">
              We noticed you've reviewed your Employability Diagnostic Report.
            </p>
            <div style="border-left:4px solid %s;padding:16px 20px;background:%s;border-radius:0 8px 8px 0;margin:0 0 24px;">
              <p style="margin:0;font-size:15px;color:%s;line-height:1.6;">
                Your score of <strong>%s/10</strong> indicates there are structural gaps that may be
                quietly reducing your callback rate — even if your experience looks strong on paper.
              </p>
            </div>
            <p style="font-size:15px;color:%s;margin:0 0 12px;line-height:1.6;">
              A 30-minute consultation can help you understand:
            </p>
            <ul style="margin:0 0 24px;padding-left:20px;color:%s;font-size:15px;line-height:1.8;">
              <li>Exactly which gaps are affecting your shortlisting</li>
              <li>The order in which to fix them for fastest results</li>
              <li>Specific changes to your LinkedIn and resume</li>
            </ul>
            %s
            """.formatted(
                TEXT_DARK, name,
                TEXT_DARK,
                BRAND_ACCENT, "#fff5f6",
                TEXT_DARK, score,
                TEXT_DARK,
                TEXT_DARK,
                ctaButton("Book a Free Consultation", consultationLink)
            )
        );
    }

    private String renderConsultationUrgency(Map<String, String> p) {
        String name             = get(p, "NAME", "there");
        String score            = get(p, "SCORE", "—");
        String band             = get(p, "BAND", "");
        String consultationLink = get(p, "CONSULTATION_LINK", "#");

        return wrap(
            "Don't Ignore This",
            """
            <p style="font-size:16px;color:%s;margin:0 0 16px;">Hi %s,</p>
            <div style="background:%s;border-radius:12px;padding:24px;margin:0 0 24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#fff;text-transform:uppercase;letter-spacing:1px;opacity:0.8;">
                Your diagnostic score
              </p>
              <p style="margin:0;font-size:36px;font-weight:700;color:#fff;line-height:1;">
                %s/10 %s
              </p>
            </div>
            <p style="font-size:15px;color:%s;margin:0 0 20px;line-height:1.6;">
              Candidates scoring in this range are statistically
              <strong>2–3× less likely to get shortlisted</strong> without targeted intervention.
            </p>
            <p style="font-size:15px;color:%s;margin:0 0 28px;line-height:1.6;">
              The good news: these are fixable gaps. A single focused consultation
              can show you exactly what to change — and in what order.
            </p>
            %s
            <p style="font-size:13px;color:%s;margin:28px 0 0;line-height:1.5;">
              This is the last nudge we'll send. If you're ready to act on your report,
              book below. If not, no hard feelings — we're here when you are.
            </p>
            """.formatted(
                TEXT_DARK, name,
                BRAND_ACCENT,
                score, band.isBlank() ? "" : "· " + band,
                TEXT_DARK,
                TEXT_DARK,
                ctaButton("Book Your Consultation", consultationLink),
                TEXT_MUTED
            )
        );
    }

    private String renderBookingConfirmed(Map<String, String> p) {
        String name       = get(p, "NAME", "there");
        String bookingRef = get(p, "BOOKING_REF", "—");
        String date       = get(p, "DATE", "—");
        String time       = get(p, "TIME", "—");

        return wrap(
            "Consultation Confirmed",
            """
            <p style="font-size:16px;color:%s;margin:0 0 16px;">Hi %s,</p>
            <p style="font-size:15px;color:%s;margin:0 0 24px;line-height:1.6;">
              Your consultation has been booked successfully.
            </p>
            <div style="background:%s;border-radius:12px;padding:24px;margin:0 0 28px;">
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                    <span style="font-size:13px;color:%s;text-transform:uppercase;letter-spacing:0.5px;">Booking Reference</span>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                    <strong style="color:%s;font-size:15px;">%s</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                    <span style="font-size:13px;color:%s;text-transform:uppercase;letter-spacing:0.5px;">Preferred Date</span>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
                    <span style="color:%s;font-size:15px;">%s</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="font-size:13px;color:%s;text-transform:uppercase;letter-spacing:0.5px;">Preferred Time</span>
                  </td>
                  <td style="padding:8px 0;text-align:right;">
                    <span style="color:%s;font-size:15px;">%s</span>
                  </td>
                </tr>
              </table>
            </div>
            <p style="font-size:15px;color:%s;margin:0 0 12px;line-height:1.6;">
              Our advisor will reach out to confirm the meeting link and any prep materials
              before your session.
            </p>
            <p style="font-size:15px;color:%s;margin:0;line-height:1.6;">
              If you need to reschedule, simply reply to this email.
            </p>
            """.formatted(
                TEXT_DARK, name,
                TEXT_DARK,
                BRAND_LIGHT,
                TEXT_MUTED, TEXT_DARK, bookingRef,
                TEXT_MUTED, TEXT_DARK, date,
                TEXT_MUTED, TEXT_DARK, time,
                TEXT_DARK,
                TEXT_DARK
            )
        );
    }

    private String renderGeneric(Map<String, String> p) {
        String body = p != null ? String.join("<br>",
                p.values().stream().filter(v -> v != null && !v.isBlank()).toList()) : "";
        return wrap("Message from QualScore",
                "<p style=\"font-size:15px;color:" + TEXT_DARK + ";line-height:1.6;\">" + body + "</p>");
    }

    private String wrap(String heading, String bodyContent) {
        return """
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" style="width:100%;border-collapse:collapse;background:#f3f4f6;">
            <tr><td style="padding:32px 16px;">
              <table role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

                <!-- Header -->
                <tr>
                  <td style="background:%s;padding:28px 32px;">
                    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">QualScore</p>
                    <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">Employability Diagnostic</p>
                  </td>
                </tr>

                <!-- Heading bar -->
                <tr>
                  <td style="background:%s;padding:20px 32px;">
                    <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;line-height:1.3;">%s</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    %s
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:%s;padding:20px 32px;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;color:%s;line-height:1.6;">
                      You're receiving this because you completed the QualScore Employability Diagnostic.<br>
                      QualScore · Helping professionals get shortlisted
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """.formatted(BRAND_DARK, BRAND_BLUE, heading, bodyContent, BRAND_LIGHT, TEXT_MUTED);
    }

    private String ctaButton(String label, String url) {
        return """
        <div style="text-align:center;margin:0 0 8px;">
          <a href="%s"
             style="display:inline-block;background:%s;color:#ffffff;font-size:15px;
                    font-weight:600;padding:14px 32px;border-radius:8px;
                    text-decoration:none;letter-spacing:0.3px;">
            %s
          </a>
        </div>
        """.formatted(url, BRAND_ACCENT, label);
    }

    private String bandColor(String band) {
        return switch (band.toLowerCase()) {
            case "strong"             -> "#16a34a";
            case "needs optimization" -> "#d97706";
            case "critical"           -> "#dc2626";
            default                   -> BRAND_BLUE;
        };
    }

    private String get(Map<String, String> p, String key, String fallback) {
        if (p == null) return fallback;
        String v = p.get(key);
        return (v != null && !v.isBlank()) ? v : fallback;
    }
}
