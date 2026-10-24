"use client";

/* eslint-disable @next/next/no-img-element */
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { happyApi } from "./api";
import { HappyBrandMark, HappyKitten } from "./HappyBrand";
import { Icon } from "./icons";
import { useSession } from "./session";
import type { ZoneQr } from "./types";
import { Feedback, Skeleton, useResource } from "./ui";

/**
 * Teacher: printable school-location QR codes. Each code encodes
 * `<this origin>/student/sos?zone=<id>&sig=<hmac>` — signed by the plugin, validated
 * server-side on every scan against the student's own school.
 */
export function TeacherZonesScreen() {
  const { session } = useSession();
  const load = useCallback(() => happyApi.zoneQrCodes(), []);
  const { data, loading, error, refresh } = useResource(load, "zone-qr");
  const [images, setImages] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (!data) return;
    const base = window.location.origin;
    setOrigin(base);
    void Promise.all(
      data.map(async (item: ZoneQr) => {
        const url = `${base}${item.path}`;
        const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: "M", color: { dark: "#0F2D5B", light: "#FFFFFF" } });
        return [item.zone._id, dataUrl] as const;
      }),
    ).then((pairs) => setImages(Object.fromEntries(pairs)));
  }, [data]);

  function download(item: ZoneQr) {
    const href = images[item.zone._id];
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = `happy2help-qr-${item.zone.nameMn}.png`;
    a.click();
  }

  return (
    <div className="happy-page happy-zones">
      <div className="happy-teacher-intro happy-print-hide">
        <div>
          <p className="happy-eyebrow">{session?.schoolName}</p>
          <h1>Байршлын QR кодууд</h1>
          <p>Код бүрийг хэвлээд тухайн газарт наана. Сурагч уншуулахад байршил серверээр баталгаажна.</p>
        </div>
        <div className="happy-zones__actions">
          <button type="button" className="happy-icon-button" onClick={refresh} aria-label="Шинэчлэх"><Icon.Refresh size={20} /></button>
          <button type="button" className="happy-button happy-button--primary" onClick={() => window.print()}>
            <Icon.Folder size={20} /> Хэвлэх
          </button>
        </div>
      </div>
      <p className="happy-safety-note happy-print-hide">
        QR код нь аль цэгийг уншуулсныг баталдаг болохоос хүн яг тэнд байгааг баталдаггүй. Код дотор сургуулийн мэдээлэл байхгүй: сервер сурагчийн бүртгэлээс сургуулийг тодорхойлж, байршил тэр сургуульд хамаарах эсэхийг шалгана.
      </p>
      {loading && <Skeleton kind="zones" />}
      {error && <Feedback tone="error" title="QR кодуудыг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && data.length === 0 && <Feedback illustration title="Байршил бүртгэгдээгүй байна" detail="Сургуулийн байршлуудыг бүртгэсний дараа QR кодууд энд гарна." />}
      <ul className="happy-qr-grid">
        {data?.map((item) => (
          <li key={item.zone._id} className="happy-qr-card">
            <div className="happy-qr-card__head">
              <HappyBrandMark />
              <HappyKitten pose="welcome" className="happy-qr-card__kitten" />
            </div>
            <p className="happy-qr-card__cta">Тусламж хэрэгтэй юу? Утасныхаа камераар уншуул.</p>
            {images[item.zone._id] ? (
              <img className="happy-qr-card__image" src={images[item.zone._id]} alt={`${item.zone.nameMn} байршлын QR код`} />
            ) : (
              <div className="happy-skeleton happy-qr-card__image" />
            )}
            <p className="happy-qr-card__zone"><Icon.Pin size={20} /> {item.zone.nameMn}</p>
            <p className="happy-qr-card__origin">{origin.replace(/^https?:\/\//, "")}</p>
            <button type="button" className="happy-text-button happy-print-hide" onClick={() => download(item)} disabled={!images[item.zone._id]}>
              <Icon.Arrow size={16} /> PNG татах
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
