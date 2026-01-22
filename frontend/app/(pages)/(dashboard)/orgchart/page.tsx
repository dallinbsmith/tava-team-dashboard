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

function OrgChartLoadingSkeleton({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="h-full">
      {/* Header skeleton */}
      <div className="mb-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-theme-elevated rounded mb-2" />
            <div className="h-4 w-96 bg-theme-elevated rounded" />
          </div>
          {canEdit && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-44 bg-theme-elevated rounded-full" />
              <div className="h-10 w-36 bg-theme-elevated rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* Draft manager skeleton */}
      {canEdit && (
        <div className="mb-6 animate-pulse">
          <div className="bg-theme-elevated border border-theme-border p-4 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 bg-theme-muted rounded" />
                <div className="h-5 w-64 bg-theme-muted rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-28 bg-theme-muted rounded" />
                <div className="h-9 w-24 bg-theme-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Org chart tree skeleton */}
      <OrgChartTreeSkeleton />

      {/* Legend skeleton */}
      <div className="mt-6 flex items-center gap-6 text-sm animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 bg-theme-elevated rounded" />
            <div className="h-4 w-24 bg-theme-elevated rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
