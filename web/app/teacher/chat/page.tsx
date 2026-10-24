import { ConversationsScreen } from "@/features/happy2help/chat-screens";

export const metadata = { title: "Чат · Happy2Help" };

export default function TeacherChatPage() {
  return <ConversationsScreen audience="teacher" />;
}
