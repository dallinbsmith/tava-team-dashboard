export default function TimeOffLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div>
          <div className="h-8 w-32 bg-theme-elevated rounded" />
          <div className="h-4 w-72 bg-theme-elevated rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-theme-elevated rounded" />
          <div className="h-10 w-36 bg-theme-elevated rounded" />
        </div>
      </div>

      <div className="flex gap-4 border-b border-theme-border pb-2">
        <div className="h-8 w-32 bg-theme-elevated rounded" />
        <div className="h-8 w-40 bg-theme-elevated rounded" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-theme-elevated rounded" />
        ))}
      </div>

      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-border">
          <div className="h-6 w-40 bg-theme-elevated rounded" />
        </div>

        <div className="divide-y divide-theme-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-theme-elevated rounded-full" />
                  <div>
                    <div className="h-5 w-32 bg-theme-elevated rounded mb-2" />
                    <div className="h-4 w-48 bg-theme-elevated rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-6 w-20 bg-theme-elevated rounded" />
                  <div className="h-6 w-24 bg-theme-elevated rounded" />
                  <div className="h-8 w-16 bg-theme-elevated rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
