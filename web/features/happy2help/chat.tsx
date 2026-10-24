"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { happyApi } from "./api";
import { newClientId } from "./id";
import { Icon } from "./icons";
import type { Conversation, Message } from "./types";
import { Feedback, Skeleton, formatDateTime, relativeTime, usePolling, useResource } from "./ui";

const dayKey = (iso: string) => new Date(iso).toDateString();
const timeOnly = new Intl.DateTimeFormat("mn-MN", { timeStyle: "short" });

/**
 * One chat surface for every room type. Messages are persisted by the plugin;
 * the thread polls for newer messages (`after` cursor) while mounted.
 * No optimistic fake success: a bubble appears only after the server stored it.
 */
export function ChatThread({ conversationId, compact = false, emptyHint }: { conversationId: string; compact?: boolean; emptyHint?: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const pendingId = useRef<string | null>(null);
  const lastAt = messages?.length ? messages[messages.length - 1]!.createdAt : null;

  const loadAll = useCallback(async () => {
    try {
      setMessages(await happyApi.messages(conversationId));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Мессежүүдийг ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    setMessages(null);
    void loadAll();
  }, [loadAll]);

  const poll = useCallback(async () => {
    try {
      const fresh = await happyApi.messages(conversationId, lastAt);
      if (fresh.length) {
        setMessages((prev) => {
          const seen = new Set((prev ?? []).map((m) => m._id));
          return [...(prev ?? []), ...fresh.filter((m) => !seen.has(m._id))];
        });
      }
    } catch { /* keep last known */ }
  }, [conversationId, lastAt]);
  usePolling(poll, 3000, Boolean(messages));

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages?.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError("");
    // Same id on retry of the same draft, so a lost response never stores the message twice.
    pendingId.current ??= newClientId();
    try {
      const saved = await happyApi.sendMessage(conversationId, body, pendingId.current);
      setMessages((prev) => (prev?.some((m) => m._id === saved._id) ? prev : [...(prev ?? []), saved]));
      setDraft("");
      pendingId.current = null;
    } catch (reason) {
      setSendError(reason instanceof Error ? reason.message : "Мессеж илгээж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`happy-chat ${compact ? "happy-chat--compact" : ""}`}>
      <div className="happy-chat__scroll" role="log" aria-live="polite" aria-relevant="additions">
        {loading && !messages && <Skeleton kind="card" />}
        {error && !messages && <Feedback tone="error" title="Мессежүүдийг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={loadAll} />}
        {messages && messages.length === 0 && (
          <p className="happy-chat__empty">{emptyHint ?? "Энд одоогоор мессеж алга. Эхний мессежээ бичээрэй."}</p>
        )}
        {messages?.map((m, i) => {
          const newDay = i === 0 || dayKey(messages[i - 1]!.createdAt) !== dayKey(m.createdAt);
          return (
            <div key={m._id}>
              {newDay && <div className="happy-chat__day">{formatDateTime(m.createdAt).split(",").slice(0, 2).join(",")}</div>}
              <div className={`happy-bubble ${m.mine ? "happy-bubble--mine" : ""} ${m.senderRole === "TEACHER" ? "happy-bubble--teacher" : ""}`}>
                {!m.mine && <span className="happy-bubble__sender">{m.senderName}{m.senderRole === "TEACHER" ? " · Багш" : ""}</span>}
                <p className="happy-bubble__body">{m.body}</p>
                <time className="happy-bubble__time" dateTime={m.createdAt} title={formatDateTime(m.createdAt)}>{timeOnly.format(new Date(m.createdAt))}</time>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        className="happy-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="happy-sr-only" htmlFor={`composer-${conversationId}`}>Мессеж</label>
        <textarea
          id={`composer-${conversationId}`}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            pendingId.current = null;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Мессеж бичих…"
          rows={1}
          maxLength={2000}
          disabled={sending || Boolean(error && !messages)}
        />
        <button type="submit" className="happy-composer__send" disabled={!draft.trim() || sending} aria-label="Илгээх">
          {sending ? <Icon.Clock size={20} /> : <Icon.Arrow size={20} />}
        </button>
      </form>
      {sendError && <p className="happy-inline-error" role="alert">{sendError}</p>}
    </div>
  );
}

/** Conversation list row. */
export function ConversationRow({ conversation, onOpen }: { conversation: Conversation; onOpen: () => void }) {
  return (
    <button type="button" className={`happy-conv ${conversation.unread > 0 ? "has-unread" : ""}`} onClick={onOpen}>
      <span className={`happy-conv__avatar ${conversation.type === "INCIDENT" ? "happy-conv__avatar--incident" : ""}`} aria-hidden="true">
        {conversation.type === "INCIDENT" ? <Icon.Heart size={20} /> : conversation.title.slice(0, 1)}
      </span>
      <span className="happy-conv__copy">
        <span className="happy-conv__top">
          <strong>{conversation.title}</strong>
          {conversation.lastMessageAt && <small>{relativeTime(conversation.lastMessageAt)}</small>}
        </span>
        <span className="happy-conv__preview">{conversation.lastMessagePreview ?? conversation.subtitle ?? ""}</span>
      </span>
      {conversation.unread > 0 && <span className="happy-conv__badge" aria-label={`${conversation.unread} шинэ мессеж`}>{conversation.unread}</span>}
    </button>
  );
}

/** Adult-only response room of an incident. The plugin refuses it to students and unassigned staff. */
export function StaffRoomThread({ incidentId }: { incidentId: string }) {
  const load = useCallback(() => happyApi.staffRoom(incidentId), [incidentId]);
  const { data, loading, error, refresh } = useResource(load, `staff-room:${incidentId}`);
  return (
    <section className="happy-surface happy-followup happy-staff-room">
      <h2><Icon.Shield size={20} /> Хариуцагчдын дотоод чат</h2>
      <p className="happy-followup__hint">
        Зөвхөн энэ хүсэлтэд томилогдсон ажилтнууд болон хүүхэд хамгааллын ажилтан харна. Сурагч, эргүүл, зөвлөл харахгүй.
      </p>
      {data && <p className="happy-staff-room__members">Гишүүд: {data.participants.map((p) => p.displayName).join(", ")}</p>}
      {loading && !data && <Skeleton kind="card" />}
      {error && !data && <Feedback tone="error" title="Дотоод чатыг нээж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && <ChatThread conversationId={data._id} compact emptyHint="Хамтран ажиллах тэмдэглэлээ энд бичээрэй. Сурагч үүнийг харахгүй." />}
    </section>
  );
}

/** Loads the follow-up room of an incident and renders the thread inline. */
export function IncidentThread({ incidentId, audience }: { incidentId: string; audience: "student" | "teacher" }) {
  const load = useCallback(() => happyApi.incidentConversation(incidentId), [incidentId]);
  const { data, loading, error, refresh } = useResource(load, `incident-room:${incidentId}`);
  return (
    <section className="happy-surface happy-followup">
      <h2><Icon.Heart size={20} /> Хүсэлтийн чат</h2>
      <p className="happy-followup__hint">
        {audience === "student"
          ? "Энд зөвхөн чи болон танай сургуулийн багш нар бичнэ. Багш асуулт асууж, чи нэмж тайлбарлаж болно."
          : "Сурагчтай энэ хүсэлтийн талаар шууд холбогдох хамгаалалттай чат. Сурагч таны мессежийг харна."}
      </p>
      {loading && !data && <Skeleton kind="card" />}
      {error && !data && <Feedback tone="error" title="Чатыг нээж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && <ChatThread conversationId={data._id} compact emptyHint={audience === "student" ? "Багшид нэмж хэлэх зүйл байвал энд бичээрэй." : "Сурагчид асуулт эсвэл тайвшруулах үг бичээрэй."} />}
    </section>
  );
}
