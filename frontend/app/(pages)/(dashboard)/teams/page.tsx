import { Suspense } from "react";
import TeamsPageClient from "./TeamsPageClient";
import { FullPageSpinner } from "@/components";

export default function TeamsPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <TeamsPageClient />
    </Suspense>
  );
}
