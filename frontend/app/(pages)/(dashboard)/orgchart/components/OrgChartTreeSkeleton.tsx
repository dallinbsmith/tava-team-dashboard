export function OrgChartTreeSkeleton() {
  return (
    <div className="bg-theme-surface border border-theme-border p-8 overflow-x-auto animate-pulse">
      <div className="flex flex-col items-center min-w-max">
        {/* Root node */}
        <div className="flex flex-col items-center">
          <OrgNodeSkeleton isRoot />

          {/* Connector line */}
          <div className="w-px h-8 bg-theme-border" />

          {/* Horizontal connector */}
          <div className="h-px w-64 bg-theme-border" />

          {/* Level 2 - Direct reports */}
          <div className="flex gap-16 mt-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <OrgNodeSkeleton />

                {/* Sub-tree for middle node */}
                {i === 1 && (
                  <>
                    <div className="w-px h-6 bg-theme-border mt-2" />
                    <div className="h-px w-32 bg-theme-border" />
                    <div className="flex gap-8 mt-6">
                      {Array.from({ length: 2 }).map((_, j) => (
                        <div key={j} className="flex flex-col items-center">
                          <OrgNodeSkeleton isSmall />
                          {j === 0 && (
                            <>
                              <div className="w-px h-4 bg-theme-border mt-1" />
                              <OrgNodeSkeleton isSmall />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Sub-tree for last node */}
                {i === 2 && (
                  <>
                    <div className="w-px h-6 bg-theme-border mt-2" />
                    <OrgNodeSkeleton isSmall />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgNodeSkeleton({ isRoot = false, isSmall = false }: { isRoot?: boolean; isSmall?: boolean }) {
  const width = isSmall ? "w-44" : isRoot ? "w-56" : "w-52";
  const padding = isSmall ? "p-3" : "p-4";

  return (
    <div className={`${width} ${padding} bg-theme-elevated border border-theme-border rounded-lg shadow-sm`}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`${isSmall ? "w-8 h-8" : "w-12 h-12"} bg-theme-muted rounded-full shrink-0`} />
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className={`${isSmall ? "h-4 w-20" : "h-5 w-28"} bg-theme-muted rounded mb-1.5`} />
          {/* Title */}
          <div className={`${isSmall ? "h-3 w-16" : "h-4 w-24"} bg-theme-muted rounded`} />
        </div>
      </div>
      {!isSmall && (
        <div className="mt-3 pt-3 border-t border-theme-border flex items-center justify-between">
          <div className="h-3 w-20 bg-theme-muted rounded" />
          <div className="h-3 w-8 bg-theme-muted rounded" />
        </div>
      )}
    </div>
  );
}

export function DraftsBannerSkeleton() {
  return (
    <div className="bg-amber-900/20 border border-amber-500/30 p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-amber-500/30 rounded" />
          <div className="h-5 w-48 bg-amber-500/30 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-amber-500/30 rounded" />
          <div className="h-8 w-20 bg-amber-500/30 rounded" />
        </div>
      </div>
    </div>
  );
}
