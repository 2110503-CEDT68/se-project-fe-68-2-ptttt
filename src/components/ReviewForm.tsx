"use client";

import { useState } from "react";
import Rating from "@mui/material/Rating";

export default function ReviewForm() {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const handleRatingChange = (_event: React.SyntheticEvent, newValue: number | null) => {
    setRating(newValue);
    console.log("User rated:", newValue);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
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
            sx={{
              "& .MuiRating-iconFilled": {
                color: "#fb923c", // orange-400
              },
              "& .MuiRating-iconEmpty": {
                color: "#475569", // slate-600
              },
              "& .MuiRating-iconHover": {
                color: "#f97316", // orange-500
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
            rows={4}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
          />
        </div>

        {/* TODO: Add submit button when API is ready */}
      </div>
    </div>
  );
}
