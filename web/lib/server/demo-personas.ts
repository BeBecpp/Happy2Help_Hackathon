import "server-only";

/**
 * Fictional one-tap sign-in personas for dev-direct mode ONLY.
 * Mirrors api/src/seed/demo.ts (ids must match what the seed writes).
 * Nothing here is a real person. Never used in gateway mode.
 */
export interface DemoPersona {
  key: string;
  kind: "staff" | "student";
  principalId: string;
  email: string;
  label: string;
  subtitle: string;
  school: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  { key: "temuulen", kind: "student", principalId: "cp-demo-temuulen", email: "temuulen@demo.happy2help.test", label: "Тэмүүлэн", subtitle: "Сурагч · 8Б", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "nomin", kind: "student", principalId: "cp-demo-nomin", email: "nomin@demo.happy2help.test", label: "Номин", subtitle: "Сурагч · 7б · зөвлөлийн гишүүн", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "anu", kind: "student", principalId: "cp-demo-anu", email: "anu@demo.happy2help.test", label: "Ану", subtitle: "Сурагч · 11а · зөвлөлийн гишүүн", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "togoldor", kind: "student", principalId: "cp-demo-togoldor", email: "togoldor@demo.happy2help.test", label: "Төгөлдөр", subtitle: "Сурагч · 10а · эргүүл", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "ganbaatar", kind: "staff", principalId: "staff-demo-ganbaatar", email: "ganbaatar@demo.happy2help.test", label: "Ганбаатар багш", subtitle: "Багш · эргүүлийн ахлагч", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "oyunaa", kind: "staff", principalId: "staff-demo-oyunaa", email: "oyunaa@demo.happy2help.test", label: "Уянга багш", subtitle: "Жижүүр багш · бүх хүсэлтийг хянана", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "bat", kind: "staff", principalId: "staff-demo-bat", email: "bat@demo.happy2help.test", label: "Бат багш", subtitle: "Хүүхэд хамгааллын ажилтан · зөвлөлийн модератор", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "tsetseg", kind: "staff", principalId: "staff-demo-tsetseg", email: "tsetseg@demo.happy2help.test", label: "Мөнхзул эмч", subtitle: "Сургуулийн сувилагч", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "uyanga", kind: "staff", principalId: "staff-demo-uyanga", email: "uyanga@demo.happy2help.test", label: "Ариунаа", subtitle: "Нийгмийн ажилтан", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "ariunaa", kind: "staff", principalId: "staff-demo-ariunaa", email: "ariunaa@demo.happy2help.test", label: "Сарнай", subtitle: "Сэтгэл зүйч", school: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { key: "ikhbayar", kind: "student", principalId: "cp-demo-ikhbayar", email: "ikhbayar@demo.happy2help.test", label: "Ихбаяр", subtitle: "Сурагч · 10б", school: "Гэрэлт Зам сургууль (DEMO)" },
  { key: "saraa", kind: "staff", principalId: "staff-demo-saraa", email: "saraa@demo.happy2help.test", label: "Сараа багш", subtitle: "Багш", school: "Гэрэлт Зам сургууль (DEMO)" },
];

export const findPersona = (key: string) => DEMO_PERSONAS.find((p) => p.key === key) ?? null;
