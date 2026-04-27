"use client";

import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ReviewItem as ReviewItemType } from "../../interface";
import deleteReview from "@/libs/deleteReview";

function getAvatarColor(name: string) {
  const colors = [
    "bg-orange-500", "bg-blue-500", "bg-green-500",
    "bg-purple-500", "bg-rose-500", "bg-teal-500",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function ReviewItem({
  review,
  currentUserId,
  token,
}: {
  review: ReviewItemType;
  currentUserId?: string;
  token?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const name = review.user?.name ?? "Anonymous";
  const isOwner = currentUserId && review.user?._id === currentUserId;

  const handleDelete = async () => {
  if (!token) {
    toast.error("You must be logged in to delete a review.");
    return;
  }

  const confirmDelete = confirm("Are you sure you want to delete this review?");
  if (!confirmDelete) return;

  setLoading(true);

  const promise = deleteReview(token, review._id);

  toast.promise(promise, {
    loading: "Deleting review...",
    success: "Your review has been deleted successfully.",
    error: (err: any) =>
      err?.message || "Something went wrong while deleting the review.",
  });

  try {
    await promise;
    router.refresh();
  } catch (err) {
    // error already handled by toast.promise
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex gap-4 py-5 border-b border-slate-700/50 last:border-0">
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(name)}`}
      >
        {getInitials(name)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-slate-200 font-semibold text-sm">{name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-slate-500 text-xs">
              {formatDate(review.createdAt)}
            </span>
            {/* Delete button — only shown to review owner */}
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="text-red-500 hover:text-red-400 transition-colors disabled:opacity-40"
                title="Delete review"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Stars */}
        <div className="flex gap-0.5 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-3.5 h-3.5 ${
                star <= review.rating
                  ? "fill-orange-400 text-orange-400"
                  : "text-slate-600"
              }`}
            />
          ))}
        </div>

        {/* Comment */}
        <p className="text-slate-400 text-sm leading-relaxed">{review.comment}</p>
      </div>
    </div>
  );
}
