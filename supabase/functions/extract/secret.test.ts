import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { hasBearerSecret } from './secret.ts';

const withAuth = (value?: string) => new Request('http://fn.test', value === undefined ? {} : { headers: { authorization: value } });

describe('hasBearerSecret', () => {
  it('accepts the exact bearer secret', () => {
    expect(hasBearerSecret(withAuth('Bearer s3cret-value'), 's3cret-value')).toBe(true);
  });

  it('rejects a wrong, shorter, longer or missing secret', () => {
    const headers = ['Bearer s3cret-valuX', 'Bearer s3cret', 'Bearer s3cret-value-and-more', 'Basic s3cret-value', undefined];
    expect(headers.map((h) => hasBearerSecret(withAuth(h), 's3cret-value'))).toEqual(headers.map(() => false));
  });

  it('never accepts anything when the configured secret is empty', () => {
    expect(hasBearerSecret(withAuth('Bearer '), '')).toBe(false);
  });
});
