export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-secondary rounded w-1/3" />
              <div className="h-4 bg-secondary rounded w-1/2" />
            </div>
            <div className="h-12 w-12 bg-secondary rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-secondary rounded w-full" />
            <div className="h-4 bg-secondary rounded w-5/6" />
          </div>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-6 bg-secondary rounded-full w-16" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
