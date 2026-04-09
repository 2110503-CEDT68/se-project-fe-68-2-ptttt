import Link from "next/link";
import getCampgrounds from "@/libs/getCampgrounds";
import { CampgroundItem } from "../../interface";
import { Flame, MapPin } from "lucide-react";

export default async function Home() {
  const campgroundsResponse = await getCampgrounds();
  const campgrounds = campgroundsResponse.data?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1629] via-[#0a0f1e] to-black">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center text-center py-32 px-4">
        <h1 className="text-5xl sm:text-6xl font-bold text-orange-400 mb-6 animate-fade-in">
          Find your perfect campsite
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mb-10 animate-fade-up-delay-1">
          Discover amazing outdoor destinations and book your next adventure.
          Experience nature like never before.
        </p>
        <div className="flex gap-4 animate-fade-up-delay-2">
          <Link
            href="/campground"
            className="flex items-center gap-2 px-6 py-3 bg-orange-400 text-white rounded-lg font-medium transition-all duration-300 hover:bg-orange-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-400/40"
          >
            Explore Sites →
          </Link>
          <Link
            href="/mybooking"
            className="px-6 py-3 border border-slate-600 text-white rounded-lg font-medium transition-all duration-300 hover:bg-slate-800 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-400/20"
          >
            My Bookings
          </Link>
        </div>
      </div>

      {/* Available Campgrounds */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-white mb-6">
          Available Campgrounds
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campgrounds.map((campground: CampgroundItem) => (
            <Link
              key={campground._id}
              href={`/campground/${campground.id}`}
              className="block rounded-2xl overflow-hidden border border-slate-700/50 hover:border-orange-400/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-400/10"
            >
              <div className="relative w-full h-48 bg-slate-800">
                {campground.picture ? (
                  <img
                    src={campground.picture}
                    alt={campground.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Flame size={40} className="text-orange-400 opacity-30" />
                  </div>
                )}
              </div>
              <div className="p-4 bg-[#12172a]">
                <h3 className="text-white font-semibold">{campground.name}</h3>
                <p className="text-slate-400 text-sm flex items-center gap-1">
                  <MapPin size={14} /> {campground.address}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {campgrounds.length > 0 && (
          <div className="text-center mt-8">
            <Link
              href="/campground"
              className="px-6 py-3 border border-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-800 transition-colors"
            >
              View all campgrounds →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
