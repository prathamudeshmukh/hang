import type { CardKind, Extracted } from './types.ts';

export interface ScoredRow {
  readonly expected?: CardKind;
  readonly extracted: Pick<Extracted, 'kind' | 'title' | 'imageUrl'>;
}

export interface ScoreSummary {
  readonly total: number;
  readonly withExpectation: number;
  readonly kindCorrect: number;
  readonly usable: number;
  readonly passRate: number;
}

/** Kinds DESIGN.md gives a typeset card when there's no picture. */
const TEXT_ONLY_OK: ReadonlySet<CardKind> = new Set(['article', 'post']);

/** Usable = something worth hanging: a title, plus a picture unless the kind reads well without one. */
export function isUsable(extracted: ScoredRow['extracted']): boolean {
  return Boolean(extracted.title) && (Boolean(extracted.imageUrl) || TEXT_ONLY_OK.has(extracted.kind));
}

function isKindCorrect(row: ScoredRow): boolean {
  return row.expected === undefined || row.expected === row.extracted.kind;
}

export function score(rows: readonly ScoredRow[]): ScoreSummary {
  const withExpectation = rows.filter((row) => row.expected !== undefined);
  const passing = rows.filter((row) => isUsable(row.extracted) && isKindCorrect(row));
  return {
    total: rows.length,
    withExpectation: withExpectation.length,
    kindCorrect: withExpectation.filter(isKindCorrect).length,
    usable: rows.filter((row) => isUsable(row.extracted)).length,
    passRate: rows.length === 0 ? 0 : passing.length / rows.length,
  };
}
