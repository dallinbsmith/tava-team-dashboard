export default function OrgChartLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div>
          <div className="h-8 w-48 bg-theme-elevated rounded" />
          <div className="h-4 w-80 bg-theme-elevated rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-theme-elevated rounded" />
          <div className="h-10 w-28 bg-theme-elevated rounded" />
        </div>
      </div>

      <div className="bg-theme-elevated border border-theme-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 bg-theme-muted rounded" />
            <div className="h-5 w-64 bg-theme-muted rounded" />
          </div>
          <div className="h-8 w-24 bg-theme-muted rounded" />
        </div>
      </div>

      <div className="bg-theme-surface border border-theme-border p-8 overflow-x-auto">
        <div className="flex flex-col items-center min-w-max">
          <div className="flex flex-col items-center">
            <OrgNodeSkeleton isRoot />

            <div className="w-px h-8 bg-theme-border" />

            <div className="flex gap-12">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <OrgNodeSkeleton />

                  {i === 1 && (
                    <>
                      <div className="w-px h-8 bg-theme-border" />

                      <div className="flex gap-8">
                        {Array.from({ length: 2 }).map((_, j) => (
                          <OrgNodeSkeleton key={j} isSmall />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 bg-theme-elevated rounded" />
            <div className="h-4 w-20 bg-theme-elevated rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

const OrgNodeSkeleton = ({
  isRoot = false,
  isSmall = false,
}: {
  isRoot?: boolean;
  isSmall?: boolean;
}) => {
  const size = isSmall ? "w-40" : isRoot ? "w-56" : "w-48";
  const padding = isSmall ? "p-3" : "p-4";

  return (
    <div
      className={`${size} ${padding} bg-theme-elevated border border-theme-border rounded-lg`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`${isSmall ? "w-8 h-8" : "w-10 h-10"} bg-theme-muted rounded-full shrink-0`}
        />
        <div className="flex-1 min-w-0">
          <div
            className={`${isSmall ? "h-4 w-20" : "h-5 w-24"} bg-theme-muted rounded mb-1`}
          />
          <div
            className={`${isSmall ? "h-3 w-16" : "h-4 w-20"} bg-theme-muted rounded`}
          />
        </div>
      </div>
      {!isSmall && (
        <div className="mt-2 pt-2 border-t border-theme-border">
          <div className="h-3 w-16 bg-theme-muted rounded" />
        </div>
      )}
    </div>
  );
};
