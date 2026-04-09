"use client";
import { useState } from "react";
import { BookingItem, CampgroundItem } from "../../interface";
import AdminBookingList from "./AdminBookingList";

export default function AdminPanel({
  bookings,
  campgrounds,
  token,
}: {
  bookings: BookingItem[];
  campgrounds: CampgroundItem[];
  token: string;
}) {
  const [activeTab, setActiveTab] = useState<"bookings" | "campgrounds">(
    "bookings",
  );

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors border ${
            activeTab === "bookings"
              ? "border-orange-400 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Bookings
        </button>
        <button
          onClick={() => setActiveTab("campgrounds")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors border ${
            activeTab === "campgrounds"
              ? "border-orange-400 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Campgrounds
        </button>
      </div>

      {activeTab === "bookings" && (
        <AdminBookingList bookings={bookings} token={token} />
      )}
    </div>
  );
}
