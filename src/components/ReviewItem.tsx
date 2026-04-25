import { Star } from "lucide-react";
import { ReviewItem as ReviewItemType } from "../../interface";

// Generate consistent avatar color from name
function getAvatarColor(name: string) {
  const colors = [
    "bg-orange-500", "bg-blue-500", "bg-green-500",
    "bg-purple-500", "bg-rose-500", "bg-teal-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

// Get initials from name (e.g. "James T." -> "JT")
function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Format date to "Mar 2025" style
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function ReviewItem({ review }: { review: ReviewItemType }) {
  const name = review.user?.name ?? "Anonymous";
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);

  return (
    <div className="flex gap-4 py-5 border-b border-slate-700/50 last:border-0">
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${avatarColor}`}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-slate-200 font-semibold text-sm">{name}</span>
          <span className="text-slate-500 text-xs flex-shrink-0">
            {formatDate(review.createdAt)}
          </span>
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
