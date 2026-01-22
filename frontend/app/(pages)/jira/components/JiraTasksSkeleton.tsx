interface JiraTasksSkeletonProps {
  compact?: boolean;
}

export function JiraTasksSkeleton({ compact = false }: JiraTasksSkeletonProps) {
  const itemCount = compact ? 4 : 6;

  return (
    <div className="bg-theme-surface border border-theme-border overflow-hidden flex flex-col h-full animate-pulse">
      {/* Header */}
      <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-theme-elevated rounded" />
          <div className="h-4 w-20 bg-theme-elevated rounded" />
          <div className="h-5 w-6 bg-theme-elevated rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-theme-elevated rounded" />
          <div className="h-8 w-8 bg-theme-elevated rounded" />
          <div className="h-8 w-8 bg-theme-elevated rounded" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 divide-y divide-theme-border">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Task key and summary */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-16 bg-theme-elevated rounded" />
                  <div className="h-4 w-48 bg-theme-elevated rounded" />
                </div>
                {/* Project and status */}
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 bg-theme-elevated rounded" />
                  <div className="h-5 w-16 bg-theme-elevated rounded" />
                  {!compact && <div className="h-5 w-24 bg-theme-elevated rounded" />}
                </div>
              </div>
              {/* External link icon placeholder */}
              <div className="w-4 h-4 bg-theme-elevated rounded flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-theme-border bg-theme-elevated">
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 bg-theme-muted rounded" />
          {!compact && <div className="h-3 w-20 bg-theme-muted rounded" />}
        </div>
      </div>
    </div>
  );
}
