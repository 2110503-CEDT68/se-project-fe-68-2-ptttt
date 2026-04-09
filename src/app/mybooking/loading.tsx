export default function Loading() {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-6">My Bookings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#12172a] border border-slate-700/50 rounded-2xl p-6 animate-pulse"
            >
              <div className="h-5 bg-slate-700 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
              <div className="h-4 bg-slate-700 rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
