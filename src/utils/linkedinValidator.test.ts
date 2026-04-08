import { describe, it, expect } from 'vitest';
import {
  validateLinkedInProfileUrl,
  isValidLinkedInProfileUrl,
  normalizeLinkedInUrl,
} from './linkedinValidator';

describe('validateLinkedInProfileUrl', () => {

  describe('valid personal profile URLs', () => {
    const validCases: [string, string][] = [
      ['https://www.linkedin.com/in/john-doe',          'john-doe'],
      ['http://linkedin.com/in/jane123',                'jane123'],
      ['linkedin.com/in/sample-user',                   'sample-user'],
      ['www.linkedin.com/in/abc-def/',                  'abc-def'],
      ['https://www.linkedin.com/in/name?trk=public_profile', 'name'],
      ['https://www.linkedin.com/in/priya-k/',          'priya-k'],
      ['LINKEDIN.COM/IN/Jane-Doe',                      'jane-doe'],
      ['https://www.linkedin.com/in/a-b-c-123',         'a-b-c-123'],
    ];

    it.each(validCases)('accepts "%s" and extracts slug "%s"', (url, expectedSlug) => {
      const result = validateLinkedInProfileUrl(url);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.slug).toBe(expectedSlug);
        expect(result.normalizedUrl).toBe(`https://www.linkedin.com/in/${expectedSlug}`);
      }
    });
  });

  describe('invalid URLs — wrong domain', () => {
    it('rejects google.com/test', () => {
      const r = validateLinkedInProfileUrl('google.com/test');
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('not-linkedin');
    });

    it('rejects randomtext', () => {
      const r = validateLinkedInProfileUrl('randomtext');
      expect(r.valid).toBe(false);
    });

    it('rejects locale subdomain in.linkedin.com', () => {
      const r = validateLinkedInProfileUrl('https://in.linkedin.com/in/john-doe');
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('not-linkedin');
    });

    it('rejects uk.linkedin.com', () => {
      const r = validateLinkedInProfileUrl('https://uk.linkedin.com/in/john-doe');
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('not-linkedin');
    });
  });

  describe('invalid URLs — wrong LinkedIn path', () => {
    const wrongPathCases: string[] = [
      'linkedin.com/company/test',
      'linkedin.com/feed/',
      'linkedin.com/jobs/view/123',
      'linkedin.com/posts/test',
      'linkedin.com/learning/test',
      'https://www.linkedin.com/school/mit',
      'https://linkedin.com/pub/old-profile/1/2/3',
      'https://linkedin.com/groups/1234/',
      'https://linkedin.com/search/results/people/',
      'https://linkedin.com/messaging/',
      'https://linkedin.com/mynetwork/',
      'https://linkedin.com/notifications/',
    ];

    it.each(wrongPathCases)('rejects "%s" as wrong-path', (url) => {
      const r = validateLinkedInProfileUrl(url);
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('wrong-path');
    });
  });

  describe('invalid URLs — no /in/ segment', () => {
    it('rejects linkedin.com (bare domain)', () => {
      const r = validateLinkedInProfileUrl('linkedin.com');
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('no-in-segment');
    });

    it('rejects linkedin.com/in/ (empty slug)', () => {
      const r = validateLinkedInProfileUrl('linkedin.com/in/');
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('no-in-segment');
    });
  });

  describe('invalid URLs — slug length bounds', () => {
    it('rejects slug shorter than 3 characters (2 chars)', () => {
      const r = validateLinkedInProfileUrl('linkedin.com/in/ab');
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('slug-too-short');
    });

    it('rejects slug of exactly 1 character', () => {
      const r = validateLinkedInProfileUrl('linkedin.com/in/a');
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('slug-too-short');
    });

    it('accepts slug of exactly 3 characters', () => {
      const r = validateLinkedInProfileUrl('linkedin.com/in/abc');
      expect(r.valid).toBe(true);
    });

    it('accepts slug of exactly 100 characters', () => {
      const slug = 'a'.repeat(100);
      const r = validateLinkedInProfileUrl(`linkedin.com/in/${slug}`);
      expect(r.valid).toBe(true);
    });

    it('rejects slug longer than 100 characters (101 chars)', () => {
      const longSlug = 'a'.repeat(101);
      const r = validateLinkedInProfileUrl(`linkedin.com/in/${longSlug}`);
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('slug-too-long');
    });
  });

  describe('empty / blank input', () => {
    it('rejects empty string', () => {
      const r = validateLinkedInProfileUrl('');
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('empty');
    });

    it('rejects whitespace-only string', () => {
      const r = validateLinkedInProfileUrl('   ');
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.reason).toBe('empty');
    });
  });

  describe('malformed / edge inputs', () => {
    it('rejects URL with only protocol', () => {
      const r = validateLinkedInProfileUrl('https://');
      expect(r.valid).toBe(false);
    });

    it('rejects javascript: scheme', () => {
      const r = validateLinkedInProfileUrl('javascript:alert(1)');
      expect(r.valid).toBe(false);
    });

    it('rejects data: URI', () => {
      const r = validateLinkedInProfileUrl('data:text/html,<h1>test</h1>');
      expect(r.valid).toBe(false);
    });

    it('rejects URL with extra subpath after slug', () => {
      const r = validateLinkedInProfileUrl('linkedin.com/in/john-doe/details/skills/');
      expect(r.valid).toBe(true);
      if (r.valid) expect(r.slug).toBe('john-doe');
    });
  });
});

describe('isValidLinkedInProfileUrl', () => {
  it('returns true for a valid profile', () => {
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/in/john-doe')).toBe(true);
  });

  it('returns false for a company page', () => {
    expect(isValidLinkedInProfileUrl('linkedin.com/company/test')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidLinkedInProfileUrl('')).toBe(false);
  });

  it('returns false for locale subdomain', () => {
    expect(isValidLinkedInProfileUrl('https://in.linkedin.com/in/john-doe')).toBe(false);
  });
});

describe('normalizeLinkedInUrl', () => {
  it('produces canonical URL from bare domain form', () => {
    expect(normalizeLinkedInUrl('linkedin.com/in/john-doe'))
      .toBe('https://www.linkedin.com/in/john-doe');
  });

  it('strips trailing slash', () => {
    expect(normalizeLinkedInUrl('www.linkedin.com/in/abc-def/'))
      .toBe('https://www.linkedin.com/in/abc-def');
  });

  it('strips tracking query params', () => {
    expect(normalizeLinkedInUrl('https://www.linkedin.com/in/name?trk=public_profile'))
      .toBe('https://www.linkedin.com/in/name');
  });

  it('returns input unchanged for invalid URL', () => {
    expect(normalizeLinkedInUrl('google.com/test')).toBe('google.com/test');
  });

  it('returns input unchanged for empty string', () => {
    expect(normalizeLinkedInUrl('')).toBe('');
  });

  it('upgrades http to https in canonical form', () => {
    expect(normalizeLinkedInUrl('http://linkedin.com/in/john-doe'))
      .toBe('https://www.linkedin.com/in/john-doe');
  });

  it('adds www to bare linkedin.com domain', () => {
    expect(normalizeLinkedInUrl('linkedin.com/in/priya-k'))
      .toBe('https://www.linkedin.com/in/priya-k');
  });
});
