export default function Loading() {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="h-5 bg-slate-700 rounded w-40 animate-pulse" />
        <div className="bg-[#12172a] rounded-2xl overflow-hidden border border-slate-700/50 animate-pulse">
          <div className="w-full h-80 sm:h-96 bg-slate-700" />
          <div className="p-8 sm:p-10 space-y-4">
            <div className="h-8 bg-slate-700 rounded w-2/3" />
            <div className="h-5 bg-slate-700 rounded w-1/2" />
            <div className="h-5 bg-slate-700 rounded w-1/3" />
            <div className="mt-10 pt-8 border-t border-slate-700/50">
              <div className="h-12 bg-slate-700 rounded-xl w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
