import { Suspense } from "react";
import { SosScreen } from "@/features/happy2help/screens";
import { Skeleton } from "@/features/happy2help/ui";

export const metadata = { title: "Тусламж хүсэх · Happy2Help" };

// useSearchParams (QR deep link ?zone=&sig=) needs a Suspense boundary for static rendering.
export default function SosPage() {
  return (
    <Suspense fallback={<div className="happy-page happy-flow"><Skeleton kind="zones" /></div>}>
      <SosScreen />
    </Suspense>
  );
}
