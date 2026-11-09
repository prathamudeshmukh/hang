import { describe, expect, it } from 'vitest';
import { renderReport, type ReportRow } from '../src/node/report.ts';
import { score } from '../src/score.ts';

const HOSTILE = `"><script>alert(1)</script><img src=x onerror='boom'>&`;

function hostileRow(overrides: Partial<ReportRow['extracted']> = {}): ReportRow {
  return {
    url: 'https://evil.test/?q=1&r=2',
    extracted: {
      kind: 'post',
      adapter: 'xPost',
      url: 'https://evil.test/',
      title: HOSTILE,
      siteName: HOSTILE,
      imageUrl: `https://img.test/x.jpg"${HOSTILE}`,
      post: { authorName: HOSTILE, handle: 'h', text: HOSTILE, mediaUrls: [] },
      ...overrides,
    },
    errors: [{ adapter: 'xPost', message: HOSTILE }],
    ms: 1,
  };
}

function render(rows: readonly ReportRow[]): string {
  return renderReport(rows, score(rows));
}

describe('renderReport', () => {
  it('escapes web-sourced text so no markup survives', () => {
    const html = render([hostileRow()]);
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain("onerror='boom'");
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes image urls inside attributes', () => {
    const html = render([hostileRow({ kind: 'image', post: undefined })]);
    expect(html).not.toMatch(/src="https:\/\/img\.test\/x\.jpg"[^&]/);
  });

  it('labels each verdict: usable, wrong kind, and missing picture', () => {
    const base = { url: 'https://a.test/', errors: [], ms: 1 } as const;
    const html = render([
      { ...base, expected: 'article', extracted: { kind: 'article', adapter: 'article', url: 'https://a.test/', title: 'A', readingMinutes: 9 } },
      { ...base, expected: 'video', extracted: { kind: 'link', adapter: 'generic', url: 'https://a.test/', title: 'B' } },
      { ...base, extracted: { kind: 'video', adapter: 'externalVideo', url: 'https://a.test/', title: 'C', durationSeconds: 125, embed: { provider: 'tiktok', playableInline: false } } },
    ]);
    expect(html).toContain('>usable<');
    expect(html).toContain('>expected video<');
    expect(html).toContain('3 min · opens in tiktok');
  });

  it('marks the summary as passing at or above the bar', () => {
    const row = { url: 'https://a.test/', errors: [], ms: 1, extracted: { kind: 'image', adapter: 'directImage', url: 'https://a.test/', title: 'I', imageUrl: 'https://a.test/i.jpg' } } as const;
    expect(render([row])).toContain('class="pass"');
  });

  it('never renders a javascript: link', () => {
    const html = render([{ ...hostileRow(), url: 'javascript:alert(1)' }]);
    expect(html).not.toContain('href="javascript:');
  });
});
