import { AppShell } from "@/features/happy2help/shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell audience="student">{children}</AppShell>;
}
