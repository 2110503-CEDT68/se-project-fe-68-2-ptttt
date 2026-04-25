"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ReviewItem as ReviewItemType } from "../../interface";
import ReviewItem from "@/components/ReviewItem";

type SortOption = "most_recent" | "highest" | "lowest";

export default function ReviewList({ reviews }: { reviews: ReviewItemType[] }) {
  const [sort, setSort] = useState<SortOption>("most_recent");
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;

  const sortLabels: Record<SortOption, string> = {
    most_recent: "Most recent",
    highest: "Highest rated",
    lowest: "Lowest rated",
  };

  const sorted = [...reviews].sort((a, b) => {
    if (sort === "most_recent")
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "highest") return b.rating - a.rating;
    return a.rating - b.rating;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sorted.length / reviewsPerPage);
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const endIndex = startIndex + reviewsPerPage;
  const currentReviews = sorted.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of review list
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (reviews.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-8">
        No reviews yet. Be the first to review!
      </p>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-semibold">
          {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
        </h3>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {sortLabels[sort]}
            <ChevronDown size={14} />
          </button>

          {open && (
            <div className="absolute right-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 overflow-hidden">
              {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                <button
                  key={key}
                  onClick={() => { setSort(key); setOpen(false); setCurrentPage(1); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    sort === key
                      ? "text-orange-400 bg-slate-700/50"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                  }`}
                >
                  {sortLabels[key]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review items */}
      <div>
        {currentReviews.map((review) => (
          <ReviewItem key={review._id} review={review} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-slate-700/50">
          {/* Previous button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === 1
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-orange-400 text-slate-900"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === totalPages
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
