import { isUsable, type ScoreSummary } from '../score.ts';
import { isHttpUrl } from '../url.ts';
import type { CardKind, Extracted } from '../types.ts';
import type { AdapterError } from '../registry.ts';

export interface ReportRow {
  readonly url: string;
  readonly expected?: CardKind;
  readonly extracted: Extracted;
  readonly errors: readonly AdapterError[];
  readonly ms: number;
}

const PASS_BAR = 0.85;
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Everything in the report came from the open web: escape all of it. */
function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

function note(e: Extracted): string {
  const minutes = e.readingMinutes ?? (e.durationSeconds ? Math.ceil(e.durationSeconds / 60) : undefined);
  const parts = [minutes ? `${minutes} min` : undefined, e.siteName, e.embed && !e.embed.playableInline ? `opens in ${e.embed.provider}` : undefined];
  return parts.filter(Boolean).join(' · ');
}

function media(e: Extracted): string {
  if (e.kind === 'post' && e.post) return `<blockquote>${esc(e.post.text)}</blockquote>`;
  if (!e.imageUrl) return `<div class="noimg">${esc(e.siteName ?? 'no image')}</div>`;
  return `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(e.imageUrl)}" alt="">`;
}

function verdict(row: ReportRow): { cls: string; label: string } {
  const kindOk = row.expected === undefined || row.expected === row.extracted.kind;
  if (!kindOk) return { cls: 'bad', label: `expected ${row.expected}` };
  return isUsable(row.extracted) ? { cls: 'ok', label: 'usable' } : { cls: 'warn', label: 'missing title or image' };
}

function sourceLink(url: string): string {
  return isHttpUrl(url) ? `<a href="${esc(url)}">${esc(url)}</a>` : `<span>${esc(url)}</span>`;
}

function card(row: ReportRow): string {
  const e = row.extracted;
  const v = verdict(row);
  const errors = row.errors.map((err) => `<li>${esc(err.adapter)}: ${esc(err.message)}</li>`).join('');
  return `<article class="card">
    ${media(e)}
    <div class="tags"><span class="kind">${esc(e.kind)}</span><span>${esc(e.adapter)}</span><span class="${v.cls}">${esc(v.label)}</span></div>
    <h3>${esc(e.title ?? '(no title)')}</h3>
    <p class="note">${esc(note(e))}</p>
    ${sourceLink(row.url)}
    ${errors ? `<ul class="errs">${errors}</ul>` : ''}
    <p class="ms">${row.ms} ms</p>
  </article>`;
}

const STYLE = `
:root{--wall:#F7F5F0;--ink:#1B1A17;--ink-2:#55514A;--ink-3:#736E66;--rule:#E4E0D7;--accent:#D2462A}
@media (prefers-color-scheme:dark){:root{--wall:#161514;--ink:#EDEAE3;--ink-2:#B4AEA3;--ink-3:#9A958B;--rule:#2C2A27}}
*{box-sizing:border-box;margin:0}body{background:var(--wall);color:var(--ink);font:15px/1.5 'Hanken Grotesk',system-ui,sans-serif;padding:40px 16px}
main{max-width:1200px;margin:0 auto}h1{font:350 44px/1 Newsreader,Georgia,serif;letter-spacing:-.03em}
.sum{display:flex;flex-wrap:wrap;gap:24px;margin:16px 0 32px;font-family:Newsreader,Georgia,serif;font-style:italic;color:var(--ink-2)}
.sum b{font-style:normal;font-size:28px;color:var(--ink);display:block}.pass b{color:#2e7d4f}.fail b{color:var(--accent)}
.grid{columns:4 260px;column-gap:16px}.card{break-inside:avoid;margin-bottom:22px}
.card img{width:100%;display:block;border-radius:2px;background:var(--rule)}
.noimg{aspect-ratio:4/3;display:grid;place-items:center;border:1px dashed var(--ink-3);border-radius:2px;color:var(--ink-3);font-family:Newsreader,serif;font-style:italic}
blockquote{font:italic 17px/1.35 Newsreader,Georgia,serif;border-top:1px solid;border-bottom:1px solid;padding:10px 0}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;font-size:12px;font-weight:600}.tags span{border:1px solid var(--rule);border-radius:99px;padding:2px 9px}
.kind{background:var(--ink);color:var(--wall)}.ok{color:#2e7d4f}.warn{color:#9a6a00}.bad{color:var(--accent);border-color:var(--accent)!important}
h3{font:400 19px/1.15 Newsreader,Georgia,serif;margin-top:8px}.note,.ms{font:italic 13px Newsreader,Georgia,serif;color:var(--ink-3)}
a{font-size:12px;color:var(--ink-2);word-break:break-all}.errs{font-size:12px;color:var(--accent);padding-left:16px;margin-top:4px}`;

export function renderReport(rows: readonly ReportRow[], summary: ScoreSummary): string {
  const passed = summary.passRate >= PASS_BAR;
  const pct = Math.round(summary.passRate * 100);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Extraction Spike</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src http: https:; style-src 'unsafe-inline'">
<style>${STYLE}</style></head><body><main>
<h1>Extraction spike</h1>
<div class="sum">
  <div class="${passed ? 'pass' : 'fail'}"><b>${pct}%</b>pass rate · bar is ${PASS_BAR * 100}%</div>
  <div><b>${summary.usable}/${summary.total}</b>usable cards</div>
  <div><b>${summary.kindCorrect}/${summary.withExpectation}</b>right kind (where expected)</div>
</div>
<section class="grid">${rows.map(card).join('')}</section>
</main></body></html>`;
}
