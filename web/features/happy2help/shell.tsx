"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { HappyBrandMark } from "./HappyBrand";
import { Icon } from "./icons";
import { useSession } from "./session";

/**
 * Role-aware application shell. Routing is by Next.js URL; the student gets a
 * branded bottom navigation, the teacher a slim header. Access is confirmed by
 * the server (/api/auth/session → plugin happy2helpMe); the shell only routes.
 */
export function AppShell({ children, audience }: { children: ReactNode; audience: "student" | "teacher" }) {
  const { loading, session, mode, signOut, error } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/sign-in");
      return;
    }
    if (session.role !== audience) router.replace(session.role === "teacher" ? "/teacher/incidents" : "/student");
  }, [loading, session, audience, router]);

  if (loading || !session || session.role !== audience) {
    return (
      <div className="happy-boot" role="status">
        <HappyBrandMark />
        <p>{error === "TEMPORARY_FAILURE" ? "Сервертэй холбогдож чадсангүй…" : "Нэвтрэх мэдээлэл ачаалж байна…"}</p>
      </div>
    );
  }

  const inSos = pathname.startsWith("/student/sos");
  const onMap = pathname.startsWith("/student/map");
  const onChat = pathname.startsWith("/student/chat");
  const onMore = /^\/student\/(more|explore|council|patrol|care|ai|incidents)/.test(pathname);
  const onHome = !onMap && !onChat && !onMore;

  return (
    <div className="happy-app">
      <a href="#main-content" className="happy-skip">Үндсэн агуулга руу</a>
      <header className="happy-topbar">
        {audience === "teacher" && (
          <nav className="happy-topnav happy-topnav--mobile" aria-label="Багшийн цэс">
            <button type="button" className={pathname.startsWith("/teacher/incidents") ? "is-active" : ""} onClick={() => router.push("/teacher/incidents")}>Хүсэлтүүд</button>
            <button type="button" className={pathname.startsWith("/teacher/map") ? "is-active" : ""} onClick={() => router.push("/teacher/map")}>Зураг</button>
            <button type="button" className={pathname.startsWith("/teacher/chat") ? "is-active" : ""} onClick={() => router.push("/teacher/chat")}>Чат</button>
            <button type="button" className={pathname.startsWith("/teacher/council") ? "is-active" : ""} onClick={() => router.push("/teacher/council")}>Зөвлөл</button>
            {session.roles.includes("PATROL_SUPERVISOR") && <button type="button" className={pathname.startsWith("/teacher/patrol") ? "is-active" : ""} onClick={() => router.push("/teacher/patrol")}>Эргүүл</button>}
            {session.roles.some((r) => r === "NURSE" || r === "SOCIAL_WORKER") && <button type="button" className={pathname.startsWith("/teacher/care") ? "is-active" : ""} onClick={() => router.push("/teacher/care")}>Care</button>}
            <button type="button" className={pathname.startsWith("/teacher/zones") ? "is-active" : ""} onClick={() => router.push("/teacher/zones")}>QR</button>
          </nav>
        )}
        <div className="happy-topbar__inner">
          <button type="button" className="happy-brand-button" onClick={() => router.push(audience === "teacher" ? "/teacher/incidents" : "/student")} aria-label="Нүүр хуудас">
            <HappyBrandMark />
          </button>
          <div className="happy-topbar__right">
            {audience === "teacher" && (
              <nav className="happy-topnav" aria-label="Багшийн цэс">
                <button type="button" className={pathname.startsWith("/teacher/incidents") ? "is-active" : ""} aria-current={pathname.startsWith("/teacher/incidents") ? "page" : undefined} onClick={() => router.push("/teacher/incidents")}>Ирсэн хүсэлтүүд</button>
                <button type="button" className={pathname.startsWith("/teacher/map") ? "is-active" : ""} aria-current={pathname.startsWith("/teacher/map") ? "page" : undefined} onClick={() => router.push("/teacher/map")}>Газрын зураг</button>
                <button type="button" className={pathname.startsWith("/teacher/chat") ? "is-active" : ""} aria-current={pathname.startsWith("/teacher/chat") ? "page" : undefined} onClick={() => router.push("/teacher/chat")}>Чат</button>
                <button type="button" className={pathname.startsWith("/teacher/zones") ? "is-active" : ""} aria-current={pathname.startsWith("/teacher/zones") ? "page" : undefined} onClick={() => router.push("/teacher/zones")}>QR байршил</button>
                <button type="button" className={pathname.startsWith("/teacher/council") ? "is-active" : ""} aria-current={pathname.startsWith("/teacher/council") ? "page" : undefined} onClick={() => router.push("/teacher/council")}>Зөвлөл</button>
                {session.roles.includes("PATROL_SUPERVISOR") && <button type="button" className={pathname.startsWith("/teacher/patrol") ? "is-active" : ""} aria-current={pathname.startsWith("/teacher/patrol") ? "page" : undefined} onClick={() => router.push("/teacher/patrol")}>Эргүүл</button>}
                {session.roles.some((r) => r === "NURSE" || r === "SOCIAL_WORKER") && <button type="button" className={pathname.startsWith("/teacher/care") ? "is-active" : ""} aria-current={pathname.startsWith("/teacher/care") ? "page" : undefined} onClick={() => router.push("/teacher/care")}>Care</button>}
              </nav>
            )}
            <span className="happy-school" title={session.schoolName}>{session.schoolName}</span>
            <span className={`happy-role happy-role--${audience}`}>{audience === "teacher" ? "Багш" : "Сурагч"}</span>
            <button type="button" className="happy-icon-button" onClick={async () => { await signOut(); router.replace("/sign-in"); }} aria-label="Гарах" title="Гарах">
              <Icon.SignOut size={20} />
            </button>
          </div>
        </div>
        {mode === "dev-direct" && (
          <div className="happy-devbar" role="note">
            Локал хөгжүүлэлтийн demo · зохиомол сургууль, зохиомол хэрэглэгчид · erxes gateway холбогдоогүй (plugin нь шууд ажиллаж байна)
          </div>
        )}
      </header>
      <main id="main-content" className="happy-main">{children}</main>
      {audience === "student" && !inSos && (
        <nav className="happy-bottom-nav" aria-label="Үндсэн цэс">
          <button type="button" className={onHome ? "is-active" : ""} aria-current={onHome ? "page" : undefined} onClick={() => router.push("/student")}>
            <Icon.Home size={22} /> Нүүр
          </button>
          <button type="button" className={onChat ? "is-active" : ""} aria-current={onChat ? "page" : undefined} onClick={() => router.push("/student/chat")}>
            <Icon.Spark size={22} /> Чат
          </button>
          <button type="button" className="happy-bottom-nav__sos" onClick={() => router.push("/student/sos")} aria-label="Тусламж хүсэх">
            <Icon.Heart size={26} />
          </button>
          <button type="button" className={onMap ? "is-active" : ""} aria-current={onMap ? "page" : undefined} onClick={() => router.push("/student/map")}>
            <Icon.Pin size={22} /> Зураг
          </button>
          <button type="button" className={onMore ? "is-active" : ""} aria-current={onMore ? "page" : undefined} onClick={() => router.push("/student/explore")}>
            <Icon.Folder size={22} /> Нээх
          </button>
        </nav>
      )}
    </div>
  );
}
