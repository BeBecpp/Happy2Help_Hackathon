import { AppShell } from "@/features/happy2help/shell";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <AppShell audience="teacher">{children}</AppShell>;
}
