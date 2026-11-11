import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { isPrivateAddress } from '../../net/addresses.ts';

describe('isPrivateAddress', () => {
  it('flags loopback, private, shared, link-local and metadata IPv4 ranges', () => {
    const addresses = ['0.0.0.0', '127.0.0.1', '10.1.2.3', '100.64.0.1', '172.20.0.1', '192.168.1.1', '169.254.169.254'];
    expect(addresses.filter((a) => !isPrivateAddress(a))).toEqual([]);
  });

  it('flags documentation, benchmark and multicast IPv4 ranges', () => {
    const addresses = ['192.0.2.1', '198.18.0.1', '198.51.100.7', '203.0.113.9', '224.0.0.1', '255.255.255.255'];
    expect(addresses.filter((a) => !isPrivateAddress(a))).toEqual([]);
  });

  it('flags IPv6 loopback, unique-local, link-local, site-local and multicast', () => {
    const addresses = ['::', '::1', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'fec0::1', 'ff02::1'];
    expect(addresses.filter((a) => !isPrivateAddress(a))).toEqual([]);
  });

  it('flags IPv6 forms that embed a private IPv4 address', () => {
    const addresses = ['::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', '64:ff9b::a9fe:a9fe', '2002:7f00:1::', '2001::1', '::127.0.0.1'];
    expect(addresses.filter((a) => !isPrivateAddress(a))).toEqual([]);
  });

  it('flags local-use NAT64, IPv4-translated, discard and documentation IPv6 ranges', () => {
    const addresses = ['64:ff9b:1::a00:1', '::ffff:0:7f00:1', '100::1', '2001:db8::1'];
    expect(addresses.filter((a) => !isPrivateAddress(a))).toEqual([]);
  });

  it('allows public IPv4 and IPv6 addresses', () => {
    const addresses = ['8.8.8.8', '172.32.0.1', '93.184.216.34', '2606:4700::1111', '2a00:1450:4001::200e', '::ffff:8.8.8.8'];
    expect(addresses.filter(isPrivateAddress)).toEqual([]);
  });

  it('treats anything that is not an IP literal as private', () => {
    const values = ['', 'example.com', '1.2.3', '1.2.3.256', '01.2.3.4', '1::2::3', 'g::1', '1:2:3:4:5:6:7:8:9', '::ffff:1.2.3'];
    expect(values.filter((v) => !isPrivateAddress(v))).toEqual([]);
  });
});
