import { ConversationScreen } from "@/features/happy2help/chat-screens";

export const metadata = { title: "Чат · Happy2Help" };

export default async function StudentConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConversationScreen audience="student" id={id} />;
}
