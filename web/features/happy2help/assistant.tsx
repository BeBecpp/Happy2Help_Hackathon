"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { happyApi } from "./api";
import { Icon } from "./icons";
import type { AssistantTurn } from "./types";

const STORAGE_KEY = "h2h.assistant.v1";
const SUGGESTIONS = [
  "Ангийнхан намайг шоолоод байвал яах вэ?",
  "Шалгалтын өмнө их сандардаг. Юу хийж болох вэ?",
  "Багштайгаа яаж ярих вэ?",
];

interface Turn extends AssistantTurn { modelId?: string }

/**
 * Student Happy AI chat. Every reply is a real Gemma 4 call through the plugin; when the model is
 * unavailable the error is shown as-is and nothing is invented. History stays in this browser tab.
 */
export function AssistantScreen() {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setTurns(JSON.parse(raw) as Turn[]);
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-20))); } catch { /* ignore */ }
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const r = await happyApi.assistantAsk(next.slice(-10).map(({ role, content }) => ({ role, content })));
      setTurns((t) => [...t, { role: "assistant", content: r.reply, modelId: r.modelId }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Happy AI-д холбогдож чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    const lastUser = [...turns].reverse().find((t) => t.role === "user");
    if (!lastUser) return;
    setTurns((t) => (t.at(-1)?.role === "user" ? t.slice(0, -1) : t));
    void ask(lastUser.content);
  }

  return (
    <div className="happy-page happy-assistant">
      <p className="happy-eyebrow">Happy AI · Gemma 4</p>
      <h1><Icon.Spark size={26} /> Happy AI-тай ярилцах</h1>
      <div className="happy-assistant__notice" role="note">
        <p><strong>Би AI туслах, багш биш.</strong> Ерөнхий зөвлөгөө өгнө. Хувийн мэдээлэл (бүтэн нэр, утас, хаяг) бүү бичээрэй. DEMO орчин.</p>
        <div className="happy-assistant__actions">
          <button type="button" className="happy-button happy-button--danger" onClick={() => router.push("/student/sos")}>ЯАРАЛТАЙ SOS</button>
          <button type="button" className="happy-button happy-button--soft" onClick={() => router.push("/student/chat/new")}>Багштай ярих</button>
        </div>
      </div>

      <div className="happy-chat happy-assistant__chat">
        <div className="happy-chat__scroll" role="log" aria-live="polite">
          {turns.length === 0 && (
            <div className="happy-assistant__suggest">
              <p>Жишээ асуултууд:</p>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="happy-chip" onClick={() => void ask(s)} disabled={busy}>{s}</button>
              ))}
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className={`happy-bubble ${t.role === "user" ? "happy-bubble--mine" : "happy-bubble--ai"}`}>
              {t.role === "assistant" && <span className="happy-bubble__sender">Happy AI · {t.modelId ?? "Gemma 4"}</span>}
              <p className="happy-bubble__body">{t.content}</p>
            </div>
          ))}
          {busy && <p className="happy-chat__empty" role="status">Happy AI бодож байна…</p>}
          {error && (
            <div className="happy-inline-error" role="alert">
              {error} <button type="button" className="happy-text-button" onClick={retry}>Дахин оролдох</button>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form className="happy-composer" onSubmit={(e) => { e.preventDefault(); void ask(draft); }}>
          <label className="happy-sr-only" htmlFor="assistant-input">Асуулт</label>
          <textarea
            id="assistant-input"
            value={draft}
            maxLength={800}
            rows={1}
            placeholder="Асуултаа бичээрэй…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(draft);
              }
            }}
            disabled={busy}
          />
          <button type="submit" className="happy-composer__send" disabled={!draft.trim() || busy} aria-label="Илгээх"><Icon.Arrow size={20} /></button>
        </form>
      </div>
      {turns.length > 0 && (
        <button type="button" className="happy-text-button" onClick={() => { setTurns([]); setError(""); }}>Яриаг цэвэрлэх</button>
      )}
    </div>
  );
}
