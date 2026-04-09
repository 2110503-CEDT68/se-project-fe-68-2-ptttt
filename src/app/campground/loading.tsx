export default function Loading() {
  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="text-center mb-10">
        <div className="h-10 bg-slate-700 rounded w-64 mx-auto animate-pulse" />
        <div className="h-5 bg-slate-700 rounded w-48 mx-auto mt-4 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-[#12172a] border border-slate-700/50 rounded-xl overflow-hidden animate-pulse"
          >
            <div className="w-full h-56 bg-slate-700" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-slate-700 rounded w-3/4" />
              <div className="h-4 bg-slate-700 rounded w-1/2" />
              <div className="h-4 bg-slate-700 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
