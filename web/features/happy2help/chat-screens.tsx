"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { happyApi } from "./api";
import { ChatThread, ConversationRow } from "./chat";
import { HappyKitten } from "./HappyBrand";
import { Icon } from "./icons";
import { useSession } from "./session";
import { SUPPORT_KIND_LABEL, type StaffContact } from "./types";
import { BackButton, Feedback, Skeleton, usePolling, useResource } from "./ui";

/* ================================================================ list (student + teacher) */

export function ConversationsScreen({ audience }: { audience: "student" | "teacher" }) {
  const router = useRouter();
  const load = useCallback(() => happyApi.conversations(), []);
  const { data, loading, error, refresh, setData } = useResource(load, `conversations:${audience}`);
  const poll = useCallback(async () => {
    try { setData(await happyApi.conversations()); } catch { /* keep last known */ }
  }, [setData]);
  usePolling(poll, 5000, true);
  const base = `/${audience}/chat`;

  return (
    <div className="happy-page happy-narrow">
      <div className="happy-section-heading">
        <div>
          <p className="happy-eyebrow">{audience === "student" ? "Итгэлт насанд хүрэгчид" : "Сурагчидтай холбогдох"}</p>
          <h1>Чат</h1>
        </div>
        <div className="happy-zones__actions">
          <button type="button" className="happy-icon-button" onClick={refresh} aria-label="Шинэчлэх"><Icon.Refresh size={20} /></button>
          {audience === "student" && (
            <button type="button" className="happy-button happy-button--sky happy-button--small" onClick={() => router.push(`${base}/new`)}>
              <Icon.Heart size={18} /> Шинэ чат
            </button>
          )}
        </div>
      </div>
      {loading && !data && <Skeleton kind="card" />}
      {error && !data && <Feedback tone="error" title="Чатуудыг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && data.length === 0 && (
        <Feedback
          illustration
          title={audience === "student" ? "Одоогоор чат алга" : "Сурагчдаас мессеж ирээгүй байна"}
          detail={audience === "student" ? "Итгэдэг багш, эмч, нийгмийн ажилтандаа бичиж болно." : "Сурагч чат нээх эсвэл хүсэлтийн чатад бичихэд энд гарна."}
          action={audience === "student" ? "Багш сонгох" : undefined}
          onAction={audience === "student" ? () => router.push(`${base}/new`) : undefined}
        />
      )}
      <div className="happy-list happy-list--tight">
        {data?.map((c) => <ConversationRow key={c._id} conversation={c} onOpen={() => router.push(`${base}/${c._id}`)} />)}
      </div>
    </div>
  );
}

/* ================================================================ thread (student + teacher) */

export function ConversationScreen({ audience, id }: { audience: "student" | "teacher"; id: string }) {
  const router = useRouter();
  const load = useCallback(() => happyApi.conversation(id), [id]);
  const { data, loading, error, refresh } = useResource(load, `conversation:${id}`);
  return (
    <div className="happy-page happy-narrow happy-chat-page">
      <div className="happy-flow__top">
        <BackButton onClick={() => router.push(`/${audience}/chat`)} label="Чат" />
        {data?.incidentId && (
          <button type="button" className="happy-text-button" onClick={() => router.push(`/${audience}/incidents/${data.incidentId}`)}>
            Хүсэлтийг харах <Icon.Arrow size={16} />
          </button>
        )}
      </div>
      {loading && !data && <Skeleton kind="card" />}
      {error && !data && <Feedback tone="error" title="Чатыг нээж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && (
        <>
          <header className="happy-chat-head">
            <span className={`happy-conv__avatar ${data.type === "INCIDENT" ? "happy-conv__avatar--incident" : ""}`} aria-hidden="true">
              {data.type === "INCIDENT" ? <Icon.Heart size={20} /> : data.title.slice(0, 1)}
            </span>
            <div>
              <h1>{data.title}</h1>
              {data.subtitle && <p>{data.subtitle}</p>}
            </div>
          </header>
          <ChatThread conversationId={data._id} />
          <p className="happy-chat-note"><Icon.Shield size={14} /> Яаралтай аюул тулгарвал ойр байгаа насанд хүрсэн хүнд шууд хэлээрэй. Чат нь яаралтай тусламжийн суваг биш.</p>
        </>
      )}
    </div>
  );
}

/* ================================================================ student: pick a trusted adult */

const KIND_ORDER: StaffContact["supportKind"][] = ["DUTY_TEACHER", "NURSE", "SOCIAL_WORKER", "PSYCHOLOGIST", "TEACHER"];

export function NewChatScreen() {
  const router = useRouter();
  const { session } = useSession();
  const load = useCallback(() => happyApi.staffDirectory(), []);
  const { data, loading, error, refresh } = useResource(load, "staff-directory");
  const [opening, setOpening] = useState("");
  const [openError, setOpenError] = useState("");

  async function open(contact: StaffContact) {
    setOpening(contact.principalId);
    setOpenError("");
    try {
      const conversation = await happyApi.directOpen(contact.principalId);
      router.push(`/student/chat/${conversation._id}`);
    } catch (reason) {
      setOpenError(reason instanceof Error ? reason.message : "Чат нээж чадсангүй.");
      setOpening("");
    }
  }

  const sorted = data?.slice().sort((a, b) => KIND_ORDER.indexOf(a.supportKind) - KIND_ORDER.indexOf(b.supportKind));

  return (
    <div className="happy-page happy-narrow">
      <BackButton onClick={() => router.push("/student/chat")} label="Чат" />
      <div className="happy-flow__heading">
        <div>
          <p className="happy-eyebrow">{session?.schoolName}</p>
          <h1>Хэнтэй ярилцах вэ?</h1>
          <p className="happy-intro">Танай сургуулийн итгэлт насанд хүрэгчид. Мессеж чинь зөвхөн тэр хүнд очно.</p>
        </div>
        <HappyKitten pose="listening" className="happy-flow__kitten" />
      </div>
      {openError && <p className="happy-inline-error" role="alert">{openError}</p>}
      {loading && <Skeleton kind="zones" />}
      {error && <Feedback tone="error" title="Багш нарын жагсаалтыг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && data.length === 0 && <Feedback title="Багш бүртгэгдээгүй байна" detail="Сургуулийн ажилтанд мэдэгдээрэй." />}
      <div className="happy-list happy-list--tight">
        {sorted?.map((c) => (
          <button key={c.principalId} type="button" className="happy-persona" disabled={opening !== ""} onClick={() => void open(c)}>
            <span className="happy-persona__avatar" aria-hidden="true">{c.displayName.slice(0, 1)}</span>
            <span className="happy-persona__copy">
              <strong>{c.displayName}</strong>
              <small>{c.title ?? SUPPORT_KIND_LABEL[c.supportKind]}</small>
            </span>
            <span className={`happy-kind happy-kind--${c.supportKind.toLowerCase()}`}>{SUPPORT_KIND_LABEL[c.supportKind]}</span>
            {opening === c.principalId ? <Icon.Clock size={18} /> : <Icon.Arrow size={18} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================ student: modules overview */

export function MoreScreen() {
  const router = useRouter();
  const modules = [
    { key: "care", title: "Итгэлт насанд хүрэгчид", desc: "Багш, сувилагч, нийгмийн ажилтан, сэтгэл зүйчтэй шууд чатлах.", status: "ready" as const, href: "/student/chat/new" },
    { key: "sos", title: "Тусламж хүсэх (SOS)", desc: "QR эсвэл байршил сонгоод багшид мэдэгдэх, төлөвөө харах.", status: "ready" as const, href: "/student/sos" },
    { key: "map", title: "Сургуулийн газрын зураг", desc: "Байршлуудыг зураг дээр харж сонгох.", status: "ready" as const, href: "/student/sos" },
    { key: "council", title: "Сурагчдын зөвлөл", desc: "Санал хүсэлт илгээх, зөвлөлийн inbox ба групп чат.", status: "soon" as const },
    { key: "patrol", title: "Сурагч эргүүл", desc: "Ээлжийн төлөв, багийн чат, аюулгүй ажиглалт мэдээлэх.", status: "soon" as const },
  ];
  return (
    <div className="happy-page happy-narrow">
      <p className="happy-eyebrow">Happy2Help</p>
      <h1>Бүх боломжууд</h1>
      <p className="happy-intro">Одоо ажиллаж байгаа болон удахгүй нэмэгдэх хэсгүүд. Зөвхөн бодитоор ажилладаг зүйлийг «Бэлэн» гэж тэмдэглэсэн.</p>
      <div className="happy-list happy-list--tight">
        {modules.map((m) => (
          <button key={m.key} type="button" className="happy-module" disabled={m.status !== "ready"} onClick={() => m.href && router.push(m.href)}>
            <span className="happy-module__copy">
              <strong>{m.title}</strong>
              <small>{m.desc}</small>
            </span>
            <span className={`happy-kind ${m.status === "ready" ? "happy-kind--ready" : "happy-kind--soon"}`}>{m.status === "ready" ? "Бэлэн" : "Удахгүй"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
