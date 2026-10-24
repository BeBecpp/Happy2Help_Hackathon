import { TeacherIncidentScreen } from "@/features/happy2help/screens";

export const metadata = { title: "Хүсэлт · Happy2Help" };

export default async function TeacherIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeacherIncidentScreen id={id} />;
}
