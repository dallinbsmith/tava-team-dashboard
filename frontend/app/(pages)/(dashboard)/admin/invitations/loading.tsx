export default function InvitationsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-8 w-36 bg-theme-elevated rounded" />
          <div className="h-4 w-72 bg-theme-elevated rounded mt-2" />
        </div>
        <div className="h-10 w-40 bg-theme-elevated rounded" />
      </div>

      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
          <div className="h-6 w-40 bg-theme-elevated rounded" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-theme-elevated rounded" />
            <div className="h-4 w-20 bg-theme-elevated rounded" />
          </div>
        </div>

        <div className="divide-y divide-theme-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="px-6 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-theme-elevated rounded flex items-center justify-center">
                  <div className="w-5 h-5 bg-theme-muted rounded" />
                </div>
                <div>
                  <div className="h-5 w-48 bg-theme-elevated rounded mb-2" />
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-20 bg-theme-elevated rounded" />
                    <div className="h-5 w-16 bg-theme-elevated rounded" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-24 bg-theme-elevated rounded" />
                <div className="h-8 w-16 bg-theme-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
