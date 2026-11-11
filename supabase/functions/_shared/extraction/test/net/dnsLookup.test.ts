import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { makeDnsLookup, type ResolveDns } from '../../net/dnsLookup.ts';

const records = (table: Record<string, readonly string[] | Error>): ResolveDns => (_host, type) => {
  const entry = table[type];
  if (entry === undefined || entry instanceof Error) return Promise.reject(entry ?? new Error('NotFound'));
  return Promise.resolve([...entry]);
};

describe('makeDnsLookup', () => {
  it('returns A and AAAA records together', async () => {
    const lookup = makeDnsLookup(records({ A: ['93.184.216.34'], AAAA: ['2606:2800::1'] }));
    expect(await lookup('example.test')).toEqual(['93.184.216.34', '2606:2800::1']);
  });

  it('accepts a host with only one record type', async () => {
    const lookup = makeDnsLookup(records({ A: ['93.184.216.34'], AAAA: new Error('NotFound') }));
    expect(await lookup('v4only.test')).toEqual(['93.184.216.34']);
  });

  it('fails when neither record type resolves', async () => {
    const lookup = makeDnsLookup(records({ A: new Error('NotFound'), AAAA: new Error('NotFound') }));
    await expect(lookup('void.test')).rejects.toThrow(/dns lookup failed/);
  });
});
