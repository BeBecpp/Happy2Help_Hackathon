import { ConversationScreen } from "@/features/happy2help/chat-screens";

export const metadata = { title: "Чат · Happy2Help" };

export default async function TeacherConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConversationScreen audience="teacher" id={id} />;
}
