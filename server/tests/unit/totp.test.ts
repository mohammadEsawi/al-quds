import './setup.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { base32Decode, base32Encode, generateTotpSecret, otpauthUrl, stepAt, totpForStep, verifyTotp } from '../../src/lib/totp.ts';

/** RFC 6238 appendix B: the reference secrets and the codes the RFC lists (8 digits). */
const SECRETS = {
  sha1: base32Encode(Buffer.from('12345678901234567890')),
  sha256: base32Encode(Buffer.from('12345678901234567890123456789012')),
  sha512: base32Encode(Buffer.from('1234567890123456789012345678901234567890123456789012345678901234')),
};
const VECTORS: [number, 'sha1' | 'sha256' | 'sha512', string][] = [
  [59, 'sha1', '94287082'],
  [1111111109, 'sha1', '07081804'],
  [1111111111, 'sha1', '14050471'],
  [1234567890, 'sha1', '89005924'],
  [2000000000, 'sha1', '69279037'],
  [20000000000, 'sha1', '65353130'],
  [59, 'sha256', '46119246'],
  [59, 'sha512', '90693936'],
];

describe('TOTP (RFC 6238)', () => {
  for (const [seconds, algorithm, expected] of VECTORS) {
    it(`${algorithm} at T=${seconds} is ${expected}`, () => {
      assert.equal(totpForStep(SECRETS[algorithm], Math.floor(seconds / 30), algorithm, 8), expected);
    });
  }

  it('base32 round-trips arbitrary bytes', () => {
    for (const length of [1, 5, 10, 20, 33]) {
      const bytes = Buffer.from(Array.from({ length }, (_, i) => (i * 37 + 11) & 255));
      assert.deepEqual(base32Decode(base32Encode(bytes)), bytes);
    }
    assert.throws(() => base32Decode('not base32 !!'));
  });

  it('generates 160-bit secrets that authenticator apps accept', () => {
    const secret = generateTotpSecret();
    assert.match(secret, /^[A-Z2-7]{32}$/);
    assert.notEqual(secret, generateTotpSecret());
  });

  it('accepts the current step and one step of clock drift either way — no more', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const step = stepAt(now);
    for (const s of [step - 1, step, step + 1]) assert.equal(verifyTotp(secret, totpForStep(secret, s), null, now), s);
    assert.equal(verifyTotp(secret, totpForStep(secret, step - 2), null, now), null);
    assert.equal(verifyTotp(secret, totpForStep(secret, step + 2), null, now), null);
  });

  it('refuses a code whose step was already used (replay)', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const step = stepAt(now);
    assert.equal(verifyTotp(secret, totpForStep(secret, step), step, now), null);
    assert.equal(verifyTotp(secret, totpForStep(secret, step - 1), step, now), null);
    assert.equal(verifyTotp(secret, totpForStep(secret, step + 1), step, now), step + 1);
  });

  it('rejects malformed input', () => {
    const secret = generateTotpSecret();
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 5']) assert.equal(verifyTotp(secret, bad), null);
  });

  it('tolerates spaces the way authenticator apps show codes (123 456)', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const code = totpForStep(secret, stepAt(now));
    assert.equal(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, null, now), stepAt(now));
  });

  it('builds an otpauth link with the issuer and account', () => {
    const url = otpauthUrl('admin@lamico.test', 'JBSWY3DPEHPK3PXP', 'Lamico');
    assert.equal(url, 'otpauth://totp/Lamico:admin%40lamico.test?secret=JBSWY3DPEHPK3PXP&issuer=Lamico&algorithm=SHA1&digits=6&period=30');
  });
});
