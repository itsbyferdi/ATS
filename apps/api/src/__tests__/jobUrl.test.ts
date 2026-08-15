import { describe, expect, it } from 'vitest';

import { isPrivateAddress } from '../jobUrl.js';

/**
 * This is the guard that stops the link reader being pointed at things the caller could
 * not get: cloud metadata, an admin page on loopback and a machine on the same network.
 * This is the only part of this project that sends a request because an unknown person
 * asked for it. Thus a test of the ranges is necessary.
 */
describe('isPrivateAddress', () => {
  const blocked = [
    '127.0.0.1', '127.1.2.3', '0.0.0.0',
    '10.0.0.1', '10.255.255.255',
    '172.16.0.1', '172.31.255.254',
    '192.168.0.1', '192.168.1.1',
    '169.254.169.254', // AWS, GCP and Azure metadata all live here
    '100.64.0.1', // carrier-grade NAT
    '224.0.0.1', '255.255.255.255',
    '::1', '::',
    'fe80::1', 'fc00::1', 'fd12:3456::1',
    '::ffff:169.254.169.254', '::ffff:127.0.0.1', // IPv4-mapped bypass attempt
    'not-an-ip', '',
  ];

  // Deliberately includes addresses just outside each blocked range, so a widened
  // boundary would fail here rather than silently blocking legitimate job boards.
  const allowed = [
    '8.8.8.8', '1.1.1.1', '13.107.42.14',
    '172.15.0.1', '172.32.0.1',
    '192.167.1.1', '192.169.1.1',
    '100.63.0.1', '100.128.0.1',
    '2606:4700:4700::1111',
  ];

  for (const ip of blocked) {
    it(`blocks ${ip || '(empty string)'}`, () => expect(isPrivateAddress(ip)).toBe(true));
  }
  for (const ip of allowed) {
    it(`allows ${ip}`, () => expect(isPrivateAddress(ip)).toBe(false));
  }
});
