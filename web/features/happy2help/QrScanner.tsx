"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export interface ScannedZone {
  zoneId: string;
  sig: string | null;
}

/**
 * Parses a Happy2Help location QR. The QR encodes a deep link
 * `https://<app>/student/sos?zone=<id>&sig=<hmac>` (so a phone's camera app can open
 * it too). Only the zone id and signature are read; the server validates both.
 */
export function parseZoneQr(text: string): ScannedZone | null {
  try {
    const url = new URL(text.trim());
    if (!url.pathname.endsWith("/student/sos")) return null;
    const zoneId = url.searchParams.get("zone");
    if (!zoneId || zoneId.length > 64) return null;
    return { zoneId, sig: url.searchParams.get("sig") };
  } catch {
    return null;
  }
}

type ScanState = "starting" | "scanning" | "denied" | "unsupported" | "error";

/**
 * In-browser camera scanner (html5-qrcode). Needs HTTPS or localhost and camera permission.
 * Frames are decoded in memory only; nothing is uploaded or stored.
 * Failure never blocks the SOS: the caller keeps the manual zone list available.
 */
export function QrScanner({ onResult, onClose }: { onResult: (zone: ScannedZone) => void; onClose: () => void }) {
  const [state, setState] = useState<ScanState>("starting");
  const [notice, setNotice] = useState("");
  const regionId = "h2h-qr-region";
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let scanner: { stop(): Promise<void>; clear(): void } | null = null;

    (async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const s = new Html5Qrcode(regionId, { verbose: false });
        scanner = s;
        await s.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 },
          (decoded) => {
            if (doneRef.current) return;
            const parsed = parseZoneQr(decoded);
            if (!parsed) {
              setNotice("Энэ QR нь Happy2Help байршлын код биш байна. Өөр кодыг уншуулна уу.");
              return;
            }
            doneRef.current = true;
            onResult(parsed);
          },
          () => undefined,
        );
        if (!cancelled) setState("scanning");
      } catch (error) {
        const name = (error as { name?: string })?.name ?? "";
        setState(name === "NotAllowedError" || /permission|denied/i.test(String(error)) ? "denied" : "error");
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) scanner.stop().then(() => scanner?.clear()).catch(() => undefined);
    };
  }, [onResult]);

  return (
    <section className="happy-scanner" aria-label="QR код уншигч">
      <div className="happy-scanner__frame">
        <div id={regionId} className="happy-scanner__video" />
        {state === "starting" && <p className="happy-scanner__overlay" role="status">Камер нээж байна…</p>}
        {state === "scanning" && <span className="happy-scanner__target" aria-hidden="true" />}
      </div>
      {state === "scanning" && <p className="happy-scanner__hint" role="status">Байршлын QR кодыг хүрээн дотор барина уу.</p>}
      {notice && <p className="happy-inline-error" role="alert">{notice}</p>}
      {state === "denied" && (
        <p className="happy-inline-error" role="alert">
          Камерын зөвшөөрөл олгогдоогүй байна. Хөтчийн тохиргооноос камерыг зөвшөөрөх эсвэл утасныхаа Camera апп-аар QR-г уншуулна уу. Доороос байршлаа гараар сонгож болно.
        </p>
      )}
      {state === "unsupported" && (
        <p className="happy-inline-error" role="alert">
          Энэ хөтөч камер уншихыг дэмжихгүй байна. Утасныхаа Camera апп-аар QR-г уншуулах эсвэл байршлаа гараар сонгоно уу.
        </p>
      )}
      {state === "error" && (
        <p className="happy-inline-error" role="alert">
          Камер нээгдсэнгүй. Утасныхаа Camera апп-аар QR-г уншуулах эсвэл байршлаа гараар сонгоно уу.
        </p>
      )}
      <button type="button" className="happy-button happy-button--soft happy-scanner__close" onClick={onClose}>
        <Icon.Back size={18} /> Камер хаах
      </button>
    </section>
  );
}
