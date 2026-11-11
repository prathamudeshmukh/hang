import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { assertFetchableUrl, type Lookup } from '../../net/guard.ts';

const resolvesTo = (...addresses: string[]): Lookup => () => Promise.resolve(addresses);

describe('assertFetchableUrl', () => {
  it('rejects non-http schemes', async () => {
    await expect(assertFetchableUrl(new URL('file:///etc/passwd'), resolvesTo('8.8.8.8'))).rejects.toThrow(/scheme/);
  });

  it('rejects hosts that resolve to a private address', async () => {
    await expect(assertFetchableUrl(new URL('https://evil.test/'), resolvesTo('8.8.8.8', '10.0.0.5'))).rejects.toThrow(/private/);
  });

  it('rejects private hosts in normalised url forms without a lookup', async () => {
    const urls = ['http://[::ffff:7f00:1]/', 'http://2130706433/', 'http://[::1]/', 'http://0.0.0.0/', 'http://[64:ff9b::a9fe:a9fe]/'];
    const results = await Promise.allSettled(urls.map((u) => assertFetchableUrl(new URL(u), resolvesTo('8.8.8.8'))));
    expect(results.map((r) => r.status)).toEqual(urls.map(() => 'rejected'));
  });

  it('rejects hosts that resolve to nothing', async () => {
    await expect(assertFetchableUrl(new URL('https://void.test/'), resolvesTo())).rejects.toThrow(/private/);
  });

  it('keeps the host out of the error message', async () => {
    await expect(assertFetchableUrl(new URL('https://secret-host.test/'), resolvesTo('10.0.0.1'))).rejects.not.toThrow(/secret-host/);
  });

  it('accepts public hosts and public IP literals', async () => {
    await expect(assertFetchableUrl(new URL('https://ok.test/'), resolvesTo('93.184.216.34'))).resolves.toBeUndefined();
    await expect(assertFetchableUrl(new URL('http://[2606:4700::1111]/'), resolvesTo())).resolves.toBeUndefined();
  });
});
