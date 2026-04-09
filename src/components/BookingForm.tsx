"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { addBooking } from "@/redux/features/bookSlice";
import { CampgroundItem } from "../../interface";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import createBooking from "@/libs/createBooking";
import toast from "react-hot-toast";

export default function BookingForm({
  campground,
  alreadyBooked,
}: {
  campground: CampgroundItem;
  alreadyBooked: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { data: session } = useSession();
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [nights, setNights] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleBooking = async () => {
    if (!bookingDate) return;
    if (!session?.user?.token) {
      router.push("/authentication");
      return;
    }

    setLoading(true);
    try {
      const res = await createBooking(
        session.user.token,
        campground._id,
        bookingDate,
        nights,
      );
      dispatch(
        addBooking({
          _id: res.data._id,
          bookingDate,
          nights,
          user: {} as any,
          campground,
        }),
      );
      router.push("/mybooking");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (alreadyBooked)
    return (
      <p className="text-red-400 font-semibold">
        You already have a booking for this campground or have reached the
        maximum number of bookings.
      </p>
    );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Booking Date
        </label>
        <input
          type="date"
          value={bookingDate}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => setBookingDate(e.target.value)}
          onBlur={(e) => {
            const selectedDate = e.target.value;
            const today = new Date().toISOString().split("T")[0];
            if (!selectedDate) return;
            if (selectedDate < today) {
              setBookingDate(today);
            }
          }}
          className="w-full bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-orange-400"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Nights
        </label>
        <input
          type="number"
          min={1}
          max={3}
          value={nights}
          onChange={(e) => {
            let val = Number(e.target.value);
            if (val > 3) val = 3;
            else if (val < 1) val = 1;
            setNights(val);
          }}
          className="w-full bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-orange-400"
        />
      </div>
      <button
        onClick={handleBooking}
        disabled={loading}
        className="w-full sm:w-auto px-8 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors duration-200"
      >
        {loading ? "Booking..." : "Add Booking"}
      </button>
    </div>
  );
}
