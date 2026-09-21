/**
 * Removes metadata segments (EXIF incl. GPS position, XMP, IPTC, comments) from a JPEG without
 * re-encoding it. Returns the input untouched for anything that is not a well-formed JPEG.
 */
export function stripJpegMetadata(buf: Buffer): Buffer {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf;
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let pos = 2;
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff) return buf; // not on a marker: bail out rather than corrupt the file
    const marker = buf[pos + 1]!;
    if (marker === 0xff) { pos += 1; continue; } // fill byte
    if (marker === 0xda || marker === 0xd9) { parts.push(buf.subarray(pos)); return Buffer.concat(parts); } // scan data / end of image
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { parts.push(buf.subarray(pos, pos + 2)); pos += 2; continue; } // no length
    const length = buf.readUInt16BE(pos + 2);
    if (length < 2 || pos + 2 + length > buf.length) return buf;
    const isMetadata = marker === 0xe1 /* EXIF, XMP */ || marker === 0xed /* IPTC */ || marker === 0xfe /* comment */;
    if (!isMetadata) parts.push(buf.subarray(pos, pos + 2 + length));
    pos += 2 + length;
  }
  return buf;
}
