// ─── Skeleton Components ──────────────────────────────────────────────
// Use these instead of spinners while data is loading.
// They show placeholder shapes that match the real layout.

// Base pulse animation
const pulse = {
  animation: "skeleton-pulse 1.5s ease-in-out infinite",
};

const baseStyle = (isDark) => ({
  backgroundColor: isDark ? "#1E4230" : "#E8F0ED",
  borderRadius: 12,
  ...pulse,
});

// ── Single skeleton block ─────────────────────────────────────────────
export function SkeletonBlock({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <>
      <div style={{ width, height, borderRadius: radius, backgroundColor: "#E8F0ED", ...pulse, ...style }} className="dark:!bg-dark-light" />
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

// ── Stat card skeleton ────────────────────────────────────────────────
export function SkeletonStatCard() {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
      <SkeletonBlock width={40} height={32} radius={8} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="60%" height={12} />
    </div>
  );
}

// ── Table row skeleton ────────────────────────────────────────────────
export function SkeletonRow() {
  return (
    <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light flex justify-between items-center">
      <div style={{ flex: 1 }}>
        <SkeletonBlock width="55%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="35%" height={11} />
      </div>
      <SkeletonBlock width={60} height={24} radius={8} />
    </div>
  );
}

// ── Card skeleton ─────────────────────────────────────────────────────
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card space-y-3">
      <SkeletonBlock width="40%" height={16} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} width={i === lines - 1 ? "60%" : "100%"} height={12} />
      ))}
    </div>
  );
}

// ── Dashboard skeleton ────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonBlock width={220} height={32} style={{ marginBottom: 8 }} />
        <SkeletonBlock width={160} height={14} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
      </div>
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light">
          <SkeletonBlock width={120} height={16} />
        </div>
        <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
      </div>
    </div>
  );
}

// ── Analytics skeleton ────────────────────────────────────────────────
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock width={160} height={32} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={5} />
      </div>
    </div>
  );
}

// ── List skeleton (harvest, scans) ────────────────────────────────────
export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light">
        <SkeletonBlock width={140} height={16} />
      </div>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}
