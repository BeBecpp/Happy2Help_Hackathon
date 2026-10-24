import { StudentIncidentScreen } from "@/features/happy2help/screens";

export const metadata = { title: "Хүсэлтийн төлөв · Happy2Help" };

export default async function StudentIncidentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  return <StudentIncidentScreen id={id} isNew={isNew === "1"} />;
}
