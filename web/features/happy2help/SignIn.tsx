"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HappyBrandMark, HappyKitten } from "./HappyBrand";
import { Icon } from "./icons";
import { useSession } from "./session";

/**
 * Sign-in. In gateway mode this is the real erxes credential form (team member or
 * Client Portal account). In dev-direct mode it lists the labelled fictional demo
 * personas instead — the only authentication available on a laptop without the gateway.
 */
export function SignInScreen() {
  const { loading, session, mode, personas, refresh } = useSession();
  const router = useRouter();
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [kind, setKind] = useState<"student" | "staff">("student");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && session) router.replace(session.role === "teacher" ? "/teacher/incidents" : "/student");
  }, [loading, session, router]);

  async function finish(body: Record<string, string>, key: string) {
    setBusyKey(key);
    setError("");
    const res = await fetch("/api/auth/login", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error ?? "Нэвтэрч чадсангүй. Дахин оролдоно уу.");
      setBusyKey("");
      return;
    }
    await refresh();
  }

  return (
    <div className="happy-signin">
      <div className="happy-signin__illustration">
        <HappyBrandMark />
        <HappyKitten pose="welcome" decorative={false} className="happy-signin__kitten" />
        <span className="happy-signin__star" aria-hidden="true" />
      </div>
      <div className="happy-signin__content">
        <p className="happy-eyebrow">Чамд зориулсан аюулгүй орон зай</p>
        <h1>Чамайг сонсоход бэлэн.</h1>
        <p>Сургуулийнхаа бүртгэлээр нэвтэрч, итгэдэг багштайгаа холбогдоорой.</p>
        {error && <p className="happy-inline-error" role="alert">{error}</p>}

        {mode === "gateway" ? (
          <form className="happy-form" onSubmit={(e) => { e.preventDefault(); void finish({ kind, login, password }, "form"); }}>
            <div className="happy-tabs" role="group" aria-label="Бүртгэлийн төрөл">
              <button type="button" className={kind === "student" ? "is-active" : ""} aria-pressed={kind === "student"} onClick={() => setKind("student")}>Сурагч</button>
              <button type="button" className={kind === "staff" ? "is-active" : ""} aria-pressed={kind === "staff"} onClick={() => setKind("staff")}>Багш</button>
            </div>
            <label className="happy-field"><span>{kind === "staff" ? "И-мэйл" : "Нэвтрэх нэр эсвэл и-мэйл"}</span>
              <input type="text" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required />
            </label>
            <label className="happy-field"><span>Нууц үг</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button type="submit" className="happy-button happy-button--sky" disabled={busyKey !== ""}>
              {busyKey ? "Нэвтэрч байна…" : "Нэвтрэх"} {!busyKey && <Icon.Arrow size={22} />}
            </button>
          </form>
        ) : (
          <div className="happy-personas">
            <p className="happy-personas__label">
              <Icon.Shield size={16} /> Хөгжүүлэлтийн горим — зохиомол сургуулийн зохиомол хэрэглэгчид. Нэг товшилтоор нэвтэрнэ.
            </p>
            {["student", "staff"].map((k) => (
              <div key={k} className="happy-personas__group">
                <h2>{k === "student" ? "Сурагчид" : "Багш нар"}</h2>
                <div className="happy-personas__grid">
                  {personas.filter((p) => p.kind === k).map((p) => (
                    <button key={p.key} type="button" className="happy-persona" disabled={busyKey !== ""} onClick={() => void finish({ personaKey: p.key }, p.key)}>
                      <span className="happy-persona__avatar" aria-hidden="true">{p.label.slice(0, 1)}</span>
                      <span className="happy-persona__copy">
                        <strong>{p.label}</strong>
                        <small>{p.subtitle}</small>
                        <small className="happy-persona__school">{p.school}</small>
                      </span>
                      {busyKey === p.key ? <span className="happy-persona__busy">…</span> : <Icon.Arrow size={18} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <small className="happy-signin__note">Happy2Help бол яаралтай тусламжийн үйлчилгээ биш. Яаралтай аюул тулгарвал ойр байгаа насанд хүрсэн хүнд шууд хэлээрэй.</small>
      </div>
    </div>
  );
}
