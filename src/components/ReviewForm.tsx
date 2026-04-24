"use client";

import { useState } from "react";
import Rating from "@mui/material/Rating";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import createReview from "@/libs/createReview";

export default function ReviewForm({
  campgroundId,
  bookingIds,
}: {
  campgroundId: string;
  bookingIds: string[];
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRatingChange = (_event: React.SyntheticEvent, newValue: number | null) => {
    setRating(newValue);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 1000) setComment(e.target.value);
  };

  const hasEligibleBooking = bookingIds.length > 0;
  const canSubmit =
    hasEligibleBooking && rating !== null && rating > 0 && comment.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    if (!session?.user?.token) {
      router.push("/authentication");
      return;
    }
    if (!hasEligibleBooking) {
      toast.error("You need a booking for this campground before you can review it");
      return;
    }
    if (rating === null || rating < 1 || rating > 5) {
      toast.error("Please select a rating between 1 and 5 stars");
      return;
    }
    if (comment.trim().length === 0) {
      toast.error("Please write a comment");
      return;
    }

    setLoading(true);
    try {
      await createReview(
        session.user.token,
        campgroundId,
        bookingIds[0],
        rating,
        comment.trim(),
      );
      toast.success("Review posted successfully");
      setRating(null);
      setComment("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to post review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Rate This Campground
      </div>
      <div className="mb-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <p className="text-slate-300 mb-4">
          How would you rate your experience?
        </p>

        {/* Rating Stars */}
        <div className="flex items-center gap-4 mb-6">
          <Rating
            name="campground-rating"
            value={rating}
            onChange={handleRatingChange}
            precision={1}
            size="large"
            disabled={!hasEligibleBooking || loading}
            sx={{
              "& .MuiRating-iconFilled": {
                color: "#fb923c",
              },
              "& .MuiRating-iconEmpty": {
                color: "#475569",
              },
              "& .MuiRating-iconHover": {
                color: "#f97316",
              },
            }}
          />
          {rating !== null && rating > 0 && (
            <span className="text-slate-300 text-sm">
              You rated: {rating} / 5 stars
            </span>
          )}
        </div>

        {/* Comment Textarea */}
        <div>
          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Share your experience at this campground"
            rows={7}
            disabled={!hasEligibleBooking || loading}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="mt-5 ml-1 text-xs text-slate-500 text-left">
          {comment.length} / 1000
        </div>

        {!hasEligibleBooking && (
          <p className="mt-3 text-sm text-red-400">
            You need a booking for this campground before you can post a review.
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-md transition-colors"
          >
            {loading ? "Posting..." : "Post Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
