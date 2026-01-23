export const TimeOffWidgetSkeleton = () => {
  return (
    <div className="bg-theme-surface border border-theme-border overflow-hidden flex flex-col h-full animate-pulse">
      {/* Header */}
      <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-theme-elevated rounded" />
          <div className="h-4 w-16 bg-theme-elevated rounded" />
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          <div className="h-7 w-20 bg-theme-elevated rounded" />
          <div className="h-7 w-20 bg-theme-elevated rounded" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 divide-y divide-theme-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            {/* Avatar */}
            <div className="w-8 h-8 bg-theme-elevated rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-24 bg-theme-elevated rounded" />
                <div className="h-4 w-16 bg-theme-elevated rounded" />
              </div>
              <div className="h-3 w-32 bg-theme-elevated rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-theme-border bg-theme-elevated mt-auto">
        <div className="h-3 w-24 bg-theme-muted rounded" />
      </div>
    </div>
  );
};
