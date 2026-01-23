import { Suspense } from "react";
import { getCurrentUserServer } from "@/lib/server-api";
import { OrgChartContent } from "./OrgChartContent";
import { OrgChartTreeSkeleton } from "./components/OrgChartTreeSkeleton";

export default async function OrgChartPage() {
  // Fetch current user first for auth check
  const currentUser = await getCurrentUserServer();
  const canEdit = currentUser.role === "admin" || currentUser.role === "supervisor";

  return (
    <Suspense fallback={<OrgChartLoadingSkeleton canEdit={canEdit} />}>
      <OrgChartContent canEdit={canEdit} />
    </Suspense>
  );
}

const OrgChartLoadingSkeleton = ({ canEdit }: { canEdit: boolean }) => {
  return (
    <div className="h-full">
      <div className="mb-4 sm:mb-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="h-7 sm:h-8 w-40 sm:w-48 bg-theme-elevated rounded mb-2" />
            <div className="h-4 w-64 sm:w-96 max-w-full bg-theme-elevated rounded" />
          </div>
          {canEdit && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="h-10 w-full sm:w-44 bg-theme-elevated rounded-full" />
              <div className="h-10 w-full sm:w-36 bg-theme-elevated rounded-full" />
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="mb-4 sm:mb-6 animate-pulse">
          <div className="bg-theme-elevated border border-theme-border p-3 sm:p-4 rounded">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 bg-theme-muted rounded" />
                <div className="h-5 w-48 sm:w-64 bg-theme-muted rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 sm:w-28 bg-theme-muted rounded" />
                <div className="h-9 w-20 sm:w-24 bg-theme-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      )}

      <OrgChartTreeSkeleton />

      <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-4 sm:gap-6 text-sm animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 bg-theme-elevated rounded" />
            <div className="h-4 w-20 sm:w-24 bg-theme-elevated rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};
