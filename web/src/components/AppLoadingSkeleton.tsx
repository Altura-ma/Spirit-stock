function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/70 ${className}`} />
}

export default function AppLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background text-primary">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        <header className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm animate-pulse" />
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-3 w-20 bg-white/50" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/70 animate-pulse" />
        </header>

        <main className="flex-1 px-5 pb-28 space-y-5">
          <section className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-24 bg-primary/10" />
                <SkeletonBlock className="h-8 w-36" />
              </div>
              <SkeletonBlock className="h-14 w-14 rounded-full bg-accent/20" />
            </div>
            <SkeletonBlock className="h-3 w-full bg-gray-100" />
            <SkeletonBlock className="h-3 w-4/5 bg-gray-100" />
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="card p-4 space-y-3">
              <SkeletonBlock className="h-10 w-10 rounded-xl bg-primary/10" />
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-3 w-16 bg-gray-100" />
            </div>
            <div className="card p-4 space-y-3">
              <SkeletonBlock className="h-10 w-10 rounded-xl bg-secondary/20" />
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-3 w-14 bg-gray-100" />
            </div>
          </section>

          <section className="space-y-3">
            <SkeletonBlock className="h-5 w-32" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <SkeletonBlock className="h-12 w-12 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-24 bg-gray-100" />
                </div>
                <SkeletonBlock className="h-8 w-14 bg-primary/10" />
              </div>
            ))}
          </section>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100">
          <div className="max-w-md mx-auto grid grid-cols-5 gap-2 px-4 py-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <SkeletonBlock className="h-6 w-6 rounded-lg bg-gray-100" />
                <SkeletonBlock className="h-2 w-10 bg-gray-100" />
              </div>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
