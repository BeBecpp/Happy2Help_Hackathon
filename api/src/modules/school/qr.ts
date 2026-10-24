import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * School-location QR codes.
 *
 * A printed QR encodes only `zoneId` + `sig`, where `sig` is an HMAC over the zone id
 * with a server secret. It carries NO school or tenant id: the server derives those from
 * the authenticated student and then checks that the zone belongs to that school and is
 * active. A copied QR therefore cannot point a report at another school, and a forged
 * zone id without a valid signature is rejected. (A QR photo can still be scanned away
 * from the spot: QR proves which checkpoint was scanned, not where the person stands.)
 */
export const QR_KEY_VERSION = 1;

function secret(): string {
  const s = process.env.HAPPY2HELP_QR_SECRET;
  if (!s || s.length < 16) throw new Error("HAPPY2HELP_QR_SECRET must be set (>= 16 chars)");
  return s;
}

export function signZone(zoneId: string, keyVersion = QR_KEY_VERSION): string {
  return createHmac("sha256", secret()).update(`${zoneId}:${keyVersion}`).digest("base64url").slice(0, 22);
}

export function verifyZoneSig(zoneId: string, sig: string | null | undefined, keyVersion = QR_KEY_VERSION): boolean {
  if (!sig || typeof sig !== "string" || sig.length > 64) return false;
  const expected = Buffer.from(signZone(zoneId, keyVersion));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Path + query the QR encodes; the web app prefixes its own public origin. */
export function qrPath(zoneId: string, sig: string): string {
  return `/student/sos?zone=${encodeURIComponent(zoneId)}&sig=${encodeURIComponent(sig)}`;
}
