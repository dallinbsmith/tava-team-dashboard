export default function CalendarLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-32 bg-theme-elevated rounded" />
        <div className="h-4 w-64 bg-theme-elevated rounded mt-2" />
      </div>

      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="p-6 border-b border-theme-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-theme-elevated rounded" />
              <div className="h-10 w-36 bg-theme-elevated rounded" />
              <div className="h-10 w-10 bg-theme-elevated rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-24 bg-theme-elevated rounded" />
              <div className="h-10 w-20 bg-theme-elevated rounded" />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-7 gap-px mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-8 bg-theme-elevated rounded" />
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-theme-elevated rounded p-2">
                <div className="h-4 w-6 bg-theme-muted rounded mb-2" />
                {i % 5 === 0 && (
                  <div className="h-5 w-full bg-theme-muted rounded mb-1" />
                )}
                {i % 7 === 2 && (
                  <div className="h-5 w-3/4 bg-theme-muted rounded" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-theme-elevated border-t border-theme-border">
          <div className="flex items-center gap-3">
            <div className="h-4 w-12 bg-theme-muted rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-20 bg-theme-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
