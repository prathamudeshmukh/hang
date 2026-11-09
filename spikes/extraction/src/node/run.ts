import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extract } from '../registry.ts';
import { score } from '../score.ts';
import { stripTracking } from '../url.ts';
import { makeNodeContext } from './fetcher.ts';
import { parseLinks, type LinkEntry } from './links.ts';
import { renderReport, type ReportRow } from './report.ts';

const CONCURRENCY = 4;
const OUT_DIR = 'out';
const DEFAULT_LINKS = 'links.txt';

async function runOne(entry: LinkEntry): Promise<ReportRow> {
  const started = performance.now();
  const url = stripTracking(new URL(entry.url)).toString();
  const { extracted, errors } = await extract(makeNodeContext(url));
  return { url: entry.url, expected: entry.expected, extracted, errors, ms: Math.round(performance.now() - started) };
}

/** Runs entries with bounded concurrency, preserving input order in the result. */
async function runAll(entries: readonly LinkEntry[]): Promise<readonly ReportRow[]> {
  const results: ReportRow[] = new Array(entries.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (let i = next++; i < entries.length; i = next++) {
      const entry = entries[i];
      if (!entry) continue;
      results[i] = await runOne(entry);
      process.stdout.write(`${String(i + 1).padStart(2)}. ${results[i]?.extracted.kind.padEnd(7)} ${entry.url}\n`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

async function main(): Promise<void> {
  const linksPath = process.argv[2] ?? DEFAULT_LINKS;
  const entries = parseLinks(await readFile(linksPath, 'utf8'));
  if (entries.length === 0) throw new Error(`no valid links in ${linksPath}`);
  const rows = await runAll(entries);
  const summary = score(rows);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(`${OUT_DIR}/results.json`, JSON.stringify({ summary, rows }, null, 2));
  await writeFile(`${OUT_DIR}/report.html`, renderReport(rows, summary));
  process.stdout.write(`\npass ${Math.round(summary.passRate * 100)}% · usable ${summary.usable}/${summary.total} · kind ${summary.kindCorrect}/${summary.withExpectation}\nreport: ${OUT_DIR}/report.html\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`spike failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
