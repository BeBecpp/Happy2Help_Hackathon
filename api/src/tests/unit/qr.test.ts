import "./setup.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { qrPath, signZone, verifyZoneSig } from "../../modules/school/qr.ts";

describe("school-location QR signatures", () => {
  it("signs deterministically and verifies", () => {
    const sig = signZone("zone-abc");
    assert.equal(sig, signZone("zone-abc"));
    assert.equal(sig.length, 22);
    assert.equal(verifyZoneSig("zone-abc", sig), true);
  });

  it("rejects a signature moved to another zone, a forged value, empty and oversized input", () => {
    const sig = signZone("zone-abc");
    assert.equal(verifyZoneSig("zone-xyz", sig), false);
    assert.equal(verifyZoneSig("zone-abc", "forged-signature-000000"), false);
    assert.equal(verifyZoneSig("zone-abc", ""), false);
    assert.equal(verifyZoneSig("zone-abc", null), false);
    assert.equal(verifyZoneSig("zone-abc", "x".repeat(100)), false);
  });

  it("a key rotation invalidates old codes", () => {
    const sig = signZone("zone-abc", 1);
    assert.equal(verifyZoneSig("zone-abc", sig, 2), false);
  });

  it("the QR path carries only zone id and signature", () => {
    const path = qrPath("zone abc/1", "s1g");
    assert.equal(path, "/student/sos?zone=zone%20abc%2F1&sig=s1g");
    assert.ok(!/school|tenant/i.test(path));
  });
});
