export default function Loading() {
  return (
    <div className="min-h-screen py-10 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="h-9 bg-slate-700 rounded w-48 animate-pulse" />
          <div className="h-9 bg-slate-700 rounded w-32 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-[#12172a] border border-slate-700/50 rounded-2xl p-6 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-5 bg-slate-700 rounded w-40" />
                  <div className="h-4 bg-slate-700 rounded w-32" />
                  <div className="h-4 bg-slate-700 rounded w-24" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-slate-700 rounded-full w-16" />
                  <div className="h-8 bg-slate-700 rounded-full w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
