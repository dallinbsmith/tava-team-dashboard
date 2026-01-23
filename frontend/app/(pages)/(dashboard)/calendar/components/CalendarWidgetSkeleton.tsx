export const CalendarWidgetSkeleton = () => {
  return (
    <div className="bg-theme-surface border border-theme-border overflow-hidden flex flex-col h-full animate-pulse">
      <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-theme-elevated rounded" />
          <div className="h-4 w-28 bg-theme-elevated rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-theme-elevated rounded" />
          <div className="h-8 w-16 bg-theme-elevated rounded" />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 bg-theme-elevated rounded" />
          <div className="flex gap-1">
            <div className="h-6 w-6 bg-theme-elevated rounded" />
            <div className="h-6 w-6 bg-theme-elevated rounded" />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 bg-theme-elevated rounded" />
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-theme-elevated rounded p-1">
              <div className="h-3 w-3 bg-theme-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 border-t border-theme-border">
        <div className="px-4 py-2 border-b border-theme-border">
          <div className="h-4 w-28 bg-theme-elevated rounded" />
        </div>
        <div className="divide-y divide-theme-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="w-1 h-8 bg-theme-elevated rounded" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-theme-elevated rounded mb-1" />
                <div className="h-3 w-24 bg-theme-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-theme-border bg-theme-elevated">
        <div className="h-3 w-24 bg-theme-muted rounded" />
      </div>
    </div>
  );
};
