export function Skeleton({ width = "100%", height = 14 }: { width?: string | number; height?: number }) {
  return (
    <span
      aria-hidden
      className="skel"
      style={{ width, height }}
    />
  );
}

export function QuestionListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="feed" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="q-card">
          <div className="q-card__nums">
            <Skeleton width={40} height={34} />
            <Skeleton width={40} height={34} />
            <Skeleton width={40} height={34} />
          </div>
          <div>
            <Skeleton width="70%" height={20} />
            <div style={{ height: 8 }} />
            <Skeleton width="100%" />
            <div style={{ height: 4 }} />
            <Skeleton width="88%" />
            <div style={{ height: 12 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <Skeleton width={60} />
              <Skeleton width={60} />
              <Skeleton width={60} />
            </div>
          </div>
          <Skeleton width={100} height={40} />
        </div>
      ))}
    </div>
  );
}
