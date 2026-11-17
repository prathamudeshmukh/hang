import { parseHTML } from 'linkedom';

const HAS_BODY = /<body[\s>]/i;

/** linkedom returns a body-less document for tag-soup pages and fragments; Readability and queries need a body. */
export function parseDocument(html: string): Document {
  const wrapped = HAS_BODY.test(html) ? html : `<!doctype html><html><head></head><body>${html}</body></html>`;
  // linkedom's Document is DOM-compatible enough for Readability at runtime.
  return parseHTML(wrapped).document as unknown as Document;
}
