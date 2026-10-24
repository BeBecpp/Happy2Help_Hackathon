"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { useSession } from "./session";

/** Explore: every module, each backed by real behaviour or an explicit honest state. */
export function ExploreScreen() {
  const router = useRouter();
  const { session } = useSession();
  const roles = session?.roles ?? [];
  const items = [
    { key: "ai", title: "Happy AI туслах", desc: "Сургуулийн амьдрал, стресс, дээрэлхэлтийн талаар AI-аас зөвлөгөө авах. AI багш биш.", href: "/student/ai", icon: <Icon.Spark size={22} />, state: "AI" },
    { key: "incidents", title: "Миний хүсэлтүүд", desc: "Илгээсэн хүсэлтийн төлөв, хариуцагч, чат.", href: "/student/incidents", icon: <Icon.List size={22} />, state: "Бэлэн" },
    { key: "care", title: "Happy Care · Эмч, нийгмийн ажилтан", desc: "Нууцлалтай хүсэлт илгээж, хариуцсан мэргэжилтэнтэй чатлах.", href: "/student/care", icon: <Icon.Heart size={22} />, state: "Бэлэн" },
    { key: "council", title: "Happy Council · Сурагчдын зөвлөл", desc: "Санал илгээх, баталгаажсан саналыг дэмжих, хэрэгжилтийг харах.", href: "/student/council", icon: <Icon.Spark size={22} />, state: roles.includes("COUNCIL_MEMBER") ? "Гишүүн" : "Бэлэн" },
    { key: "patrol", title: "Happy Patrol · Сурагч эргүүл", desc: "Ээлжээ харах, QR-ээр бүртгүүлэх, ажиглалт мэдээлэх.", href: "/student/patrol", icon: <Icon.Shield size={22} />, state: roles.includes("PATROL_STUDENT") ? "Гишүүн" : "Зөвхөн гишүүдэд" },
    { key: "map", title: "Сургуулийн газрын зураг", desc: "Давхар, анги, коридорыг зураг дээрээс сонгоод тэр байршлаас SOS илгээх.", href: "/student/map", icon: <Icon.Pin size={22} />, state: "Бэлэн" },
    { key: "academy", title: "Happy Academy", desc: "Аюулгүй байдлын хичээл, сорил. Энэ хувилбарт ороогүй.", href: null, icon: <Icon.Folder size={22} />, state: "Ороогүй" },
  ];
  return (
    <div className="happy-page happy-narrow">
      <p className="happy-eyebrow">Happy2Help</p>
      <h1>Нээж үзэх</h1>
      <p className="happy-intro">Бодитоор ажилладаг хэсгүүд. Эрхээс хамаарч зарим хэсэг зөвхөн гишүүдэд нээлттэй.</p>
      <div className="happy-list happy-list--tight">
        {items.map((m) => (
          <button key={m.key} type="button" className="happy-module" disabled={!m.href} onClick={() => m.href && router.push(m.href)}>
            <span className="happy-incident-card__icon">{m.icon}</span>
            <span className="happy-module__copy"><strong>{m.title}</strong><small>{m.desc}</small></span>
            <span className={`happy-kind ${m.href ? "happy-kind--ready" : "happy-kind--soon"}`}>{m.state}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
