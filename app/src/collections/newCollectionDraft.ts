/**
 * The + New chip's name field (#76). A draft holding a name survives a blur (a back press only drops the
 * keyboard); an empty one folds back to + New; picking another chip throws it away.
 */
export type NewCollectionDraft =
  | { readonly kind: 'closed' }
  | { readonly kind: 'open'; readonly text: string; readonly error: string | null };

export type DraftSubmit = { readonly kind: 'create'; readonly name: string } | { readonly kind: 'cancel' };

export const CLOSED: NewCollectionDraft = { kind: 'closed' };

const isBlank = (text: string) => text.trim().length === 0;

export const opened = (): NewCollectionDraft => ({ kind: 'open', text: '', error: null });

export const typed = (text: string): NewCollectionDraft => ({ kind: 'open', text, error: null });

export function failed(draft: NewCollectionDraft, error: string): NewCollectionDraft {
  return draft.kind === 'open' ? { ...draft, error } : draft;
}

export function blurred(draft: NewCollectionDraft): NewCollectionDraft {
  return draft.kind === 'open' && isBlank(draft.text) ? CLOSED : draft;
}

export const discarded = (): NewCollectionDraft => CLOSED;

/** Enter: an empty name cancels, as on Home. */
export function submitted(draft: NewCollectionDraft): DraftSubmit {
  if (draft.kind === 'closed' || isBlank(draft.text)) return { kind: 'cancel' };
  return { kind: 'create', name: draft.text.trim() };
}
