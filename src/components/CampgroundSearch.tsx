"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import CampgroundCard from "@/components/CampgroundCard";
import { CampgroundItem } from "../../interface";

export default function CampgroundSearch({
  campgrounds,
}: {
  campgrounds: CampgroundItem[];
}) {
  const [search, setSearch] = useState("");

  const filtered = campgrounds.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Search Bar */}
      <div className="relative mb-8">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search campgrounds by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-transparent border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-400 text-sm"
        />
      </div>

      {/* Count */}
      <p className="text-sm text-slate-400 mb-6">
        Showing {filtered.length} of {campgrounds.length} campgrounds
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((campground: CampgroundItem) => (
          <Link
            href={`/campground/${campground.id}`}
            key={campground._id}
            className="block h-full"
          >
            <CampgroundCard
              name={campground.name}
              picture={campground.picture}
              address={campground.address}
              tel={campground.tel}
              averageRating={
                campground.countReview > 0
                  ? campground.sumRating / campground.countReview
                  : 0
              }
              totalReviews={campground.countReview}
            />
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          No campgrounds found.
        </div>
      )}
    </div>
  );
}
