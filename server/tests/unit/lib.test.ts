import './setup.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectFile } from '../../src/lib/files.ts';
import { stripJpegMetadata } from '../../src/lib/image.ts';
import { containsNul } from '../../src/lib/nullBytes.ts';
import { weakPasswordReason } from '../../src/lib/passwordPolicy.ts';
import { open, seal } from '../../src/lib/secretBox.ts';

describe('password policy', () => {
  for (const weak of ['password1234', 'Password123456', 'P@ssw0rd12345', 'qwertyuiop1234', 'abcdefghijkl', 'aaaaaaaaaaaa', 'lamico123456!', 'iloveyou2024!!']) {
    it(`refuses ${weak}`, () => assert.ok(weakPasswordReason(weak), weak));
  }
  for (const fine of ['Correct-Horse-Battery-77', 'TestPassword-12345', 'my dog eats 3 blue apples', 'Xk9$vTq2!mLp0']) {
    it(`accepts ${fine}`, () => assert.equal(weakPasswordReason(fine), null));
  }
});

describe('NUL byte guard', () => {
  it('finds NUL anywhere in nested input', () => {
    assert.equal(containsNul('a\u0000b'), true);
    assert.equal(containsNul({ a: [{ b: 'ok' }, { c: 'x\u0000' }] }), true);
    assert.equal(containsNul({ 'k\u0000': 1 }), true);
    assert.equal(containsNul({ a: ['fine', 1, null, true] }), false);
  });
});

const segment = (marker: number, payload: Buffer) => {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), length, payload]);
};

describe('JPEG metadata stripping', () => {
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')),
    segment(0xe1, Buffer.from('Exif\0\0GPS-31.9N-35.2E')),
    segment(0xed, Buffer.from('IPTC-secret')),
    segment(0xfe, Buffer.from('a comment')),
    segment(0xdb, Buffer.alloc(65, 1)),
    Buffer.from([0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, 0x12, 0x34, 0xff, 0xd9]),
  ]);

  it('removes EXIF/XMP, IPTC and comments but keeps the picture data', () => {
    const clean = stripJpegMetadata(jpeg);
    for (const secret of ['GPS-31.9N', 'IPTC-secret', 'a comment']) assert.equal(clean.includes(secret), false, secret);
    assert.ok(clean.includes('JFIF'));
    assert.deepEqual([...clean.subarray(-2)], [0xff, 0xd9]);
    assert.ok(clean.length < jpeg.length);
    // the scan data must be byte-identical
    assert.ok(clean.subarray(clean.indexOf(Buffer.from([0xff, 0xda]))).equals(jpeg.subarray(jpeg.indexOf(Buffer.from([0xff, 0xda])))));
  });

  it('leaves anything that is not a well-formed JPEG untouched', () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    assert.equal(stripJpegMetadata(png), png);
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xe1, 0xff, 0xff]), Buffer.from('short')]);
    assert.equal(stripJpegMetadata(broken), broken);
  });
});

describe('file type detection (by content, never by name)', () => {
  const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0]);
  const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);

  it('recognises images, video and PDF', () => {
    assert.equal(detectFile(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mime, 'image/jpeg');
    assert.equal(detectFile(Buffer.from('%PDF-1.7 ...'))?.mime, 'application/pdf');
    assert.equal(detectFile(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
    assert.equal(detectFile(Buffer.from('MZ\x90\x00')), null);
    assert.equal(detectFile(Buffer.from('<?php echo 1; ?>')), null);
  });

  it('accepts .docx only when it has the Office manifest and a Word body', () => {
    assert.equal(detectFile(Buffer.concat([zip, Buffer.from('word/foo')])), null);
    assert.equal(detectFile(Buffer.concat([zip, Buffer.from('[Content_Types].xml'), Buffer.alloc(20), Buffer.from('word/document.xml')]))?.ext, 'docx');
    assert.equal(detectFile(Buffer.concat([zip, Buffer.from('[Content_Types].xml'), Buffer.from('xl/workbook.xml')])), null);
  });

  it('accepts .doc only when the OLE container has the WordDocument stream', () => {
    assert.equal(detectFile(Buffer.concat([ole, Buffer.from('Workbook', 'utf16le')])), null);
    assert.equal(detectFile(Buffer.concat([ole, Buffer.from('WordDocument', 'utf16le')]))?.ext, 'doc');
  });
});

describe('secret box (authenticator keys at rest)', () => {
  it('round-trips and never repeats', () => {
    const a = seal('JBSWY3DPEHPK3PXP');
    assert.equal(open(a), 'JBSWY3DPEHPK3PXP');
    assert.notEqual(a, seal('JBSWY3DPEHPK3PXP'));
    assert.equal(a.includes('JBSWY3DPEHPK3PXP'), false);
  });

  it('detects tampering', () => {
    const [v, iv, tag, data] = seal('secret-value').split('.');
    assert.throws(() => open([v, iv, tag, Buffer.from('tampered!!').toString('base64url')].join('.')));
    assert.throws(() => open('v1.a.b'));
    assert.throws(() => open(`v2.${iv}.${tag}.${data}`));
  });
});
