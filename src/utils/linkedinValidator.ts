/**
 * LinkedIn Profile URL Validator & Normalizer
 * ============================================
 *
 * WHAT IS VALID
 * -------------
 * A URL (or URL-like string) whose path starts with /in/ followed by a
 * profile slug of 3–100 characters, hosted on linkedin.com.
 *
 * Examples that pass:
 *   linkedin.com/in/jane-doe
 *   www.linkedin.com/in/john-smith-123
 *   https://www.linkedin.com/in/priya-k/
 *   http://linkedin.com/in/abc?trk=nav_responsive_tab_profile
 *   LINKEDIN.COM/IN/Jane-Doe          (case-insensitive host + path prefix)
 *
 * WHAT IS INTENTIONALLY REJECTED
 * --------------------------------
 * - Non-LinkedIn domains          (e.g. facebook.com/in/someone)
 * - Company pages                 (/company/)
 * - School pages                  (/school/)
 * - Job listings                  (/jobs/, /job/)
 * - Feed & activity               (/feed/, /posts/, /pulse/)
 * - Learning paths                (/learning/)
 * - Groups, events, search        (/groups/, /events/, /search/)
 * - Inbox & notifications         (/messaging/, /mynetwork/, /notifications/)
 * - Legacy public profiles        (/pub/)
 * - Slugs shorter than 3 chars   (always synthetic/invalid)
 * - Slugs longer than 100 chars  (mirrors backend DB column limit)
 * - Completely empty strings      (handled separately as a required-field error)
 * - Structurally malformed URLs   (no host parseable even after protocol injection)
 *
 * WHY NORMALIZATION IS LIMITED
 * ----------------------------
 * We only produce: https://www.linkedin.com/in/{slug}
 * We intentionally do NOT:
 *   - Decode percent-encoding in slugs (e.g. %2F) — could alter identity
 *   - Strip locale sub-domains (e.g. in.linkedin.com) — we reject those
 *   - Rewrite http: → https: in the stored value beyond our canonical form
 *   - Remove tracking query params from the raw input before writing to state
 *     (the normalizer strips them when producing the canonical URL)
 *
 * FRONTEND / BACKEND ALIGNMENT
 * -----------------------------
 * This utility and the Java LinkedInUrlValidator are intentionally kept in
 * sync:
 *   - Same rejected path list
 *   - Same slug length bounds (3–100)
 *   - Same canonical output format
 *   - Same null/blank → skip-validation behaviour (required check is separate)
 *
 * USAGE
 * -----
 *   import { validateLinkedInProfileUrl, normalizeLinkedInUrl,
 *            isValidLinkedInProfileUrl, linkedInValidationMessage } from '@/utils/linkedinValidator';
 *
 *   const result = validateLinkedInProfileUrl(userInput);
 *   if (result.valid) {
 *     saveToState(result.normalizedUrl);
 *   } else {
 *     showError(linkedInValidationMessage(result.reason));
 *   }
 */

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 100;

const REJECTED_PATH_PREFIXES: readonly string[] = [
  '/company/',
  '/school/',
  '/jobs/',
  '/job/',
  '/feed/',
  '/posts/',
  '/pulse/',
  '/learning/',
  '/events/',
  '/groups/',
  '/search/',
  '/mynetwork/',
  '/messaging/',
  '/notifications/',
  '/pub/',
];

export type LinkedInRejectionReason =
  | 'empty'
  | 'malformed'
  | 'not-linkedin'
  | 'wrong-path'
  | 'no-in-segment'
  | 'slug-too-short'
  | 'slug-too-long'
  | 'invalid';

export type LinkedInValidationResult =
  | { valid: true; normalizedUrl: string; slug: string }
  | { valid: false; reason: LinkedInRejectionReason };

/**
 * Full validation + normalization.
 *
 * Returns a discriminated union — check `.valid` before reading other fields.
 * Null / blank input returns `{ valid: false, reason: 'empty' }`.
 * Callers that treat the field as optional should guard with a blank check
 * before calling this function.
 */
export function validateLinkedInProfileUrl(raw: string): LinkedInValidationResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { valid: false, reason: 'empty' };
  }

  const withProtocol =
    /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (hostname !== 'linkedin.com') {
    return { valid: false, reason: 'not-linkedin' };
  }

  const rawPathname = url.pathname.toLowerCase();
  const pathname = rawPathname.replace(/\/+$/, '');

  for (const prefix of REJECTED_PATH_PREFIXES) {
    if (rawPathname.startsWith(prefix) || pathname.startsWith(prefix)) {
      return { valid: false, reason: 'wrong-path' };
    }
  }

  const inMatch = pathname.match(/^\/in\/([^/?#]+)/);
  if (!inMatch) {
    return { valid: false, reason: 'no-in-segment' };
  }

  const slug = inMatch[1];

  if (slug.length < SLUG_MIN_LENGTH) {
    return { valid: false, reason: 'slug-too-short' };
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return { valid: false, reason: 'slug-too-long' };
  }

  return {
    valid: true,
    slug,
    normalizedUrl: `https://www.linkedin.com/in/${slug}`,
  };
}

/**
 * Convenience predicate — returns true if the URL is a valid personal profile.
 */
export function isValidLinkedInProfileUrl(raw: string): boolean {
  return validateLinkedInProfileUrl(raw).valid;
}

/**
 * Normalize a LinkedIn profile URL to canonical form.
 *
 * Returns the canonical URL on success, or the trimmed input unchanged on
 * failure (preserves the original value for display/audit without corrupting
 * it into an empty string).
 *
 * Safe to call before saving to state or sending to the backend — the backend
 * will apply the same normalization before writing to the database.
 */
export function normalizeLinkedInUrl(raw: string): string {
  if (!raw || !raw.trim()) return raw;
  const result = validateLinkedInProfileUrl(raw);
  return result.valid ? result.normalizedUrl : raw.trim();
}

/**
 * Maps a rejection reason code to a user-facing error string.
 *
 * All messages are intentionally kept consistent with the backend validation
 * error message: "Please provide a valid LinkedIn profile URL."
 * The hint text below the input provides more specific guidance in the UI.
 */
export function linkedInValidationMessage(reason: LinkedInRejectionReason): string {
  switch (reason) {
    case 'empty':
      return 'LinkedIn profile URL is required.';
    case 'not-linkedin':
      return 'Please provide a valid LinkedIn profile URL.';
    case 'wrong-path':
      return 'Please provide a valid LinkedIn profile URL.';
    case 'no-in-segment':
      return 'Please provide a valid LinkedIn profile URL.';
    case 'slug-too-short':
      return 'Please provide a valid LinkedIn profile URL.';
    case 'slug-too-long':
      return 'Please provide a valid LinkedIn profile URL.';
    case 'malformed':
    default:
      return 'Please provide a valid LinkedIn profile URL.';
  }
}

/**
 * Single user-facing error message used in form validation.
 * Matches the backend annotation message exactly.
 */
export const LINKEDIN_VALIDATION_MESSAGE =
  'Please enter a valid LinkedIn profile URL (example: linkedin.com/in/yourname).';
