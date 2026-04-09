"use client";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { BookingItem } from "../../interface";
import { removeBooking } from "@/redux/features/bookSlice";
import deleteBooking from "@/libs/deleteBooking";
import updateBooking from "@/libs/updateBooking";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Calendar } from "lucide-react";
import toast from "react-hot-toast";

export default function BookingList({
  bookings,
  token,
}: {
  bookings: BookingItem[];
  token: string;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editNights, setEditNights] = useState(1);

  const handleDelete = async (item: BookingItem) => {
    if (!confirm("Delete this booking?")) return;
    try {
      await deleteBooking(token, item._id);
      dispatch(removeBooking(item));
      router.refresh();
    } catch {
      toast.error("Failed to delete booking");
    }
  };

  const handleEditStart = (item: BookingItem) => {
    setEditingId(item._id);
    setEditDate(item.bookingDate.split("T")[0]);
    setEditNights(item.nights);
  };

  const handleEditSave = async (bookingId: string) => {
    try {
      await updateBooking(token, bookingId, editDate, editNights);
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("Failed to update booking");
    }
  };

  if (bookings.length === 0) {
    return (
      <div className="text-xl p-4 text-center text-orange-400 mt-6">
        No Booking Found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((item: BookingItem) => (
        <div
          key={item._id}
          className="border-b border-slate-700/50 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          {editingId === item._id ? (
            <div className="space-y-2 flex-1">
              <p className="text-white font-semibold">{item.campground.name}</p>
              <p className="text-sm text-slate-400">
                📍 {item.campground.address}
              </p>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="date"
                  value={editDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setEditDate(e.target.value)}
                  onBlur={(e) => {
                    const selectedDate = e.target.value;
                    const today = new Date().toISOString().split("T")[0];
                    if (!selectedDate) return;
                    if (selectedDate < today) {
                      setEditDate(today);
                    }
                  }}
                  className="bg-slate-800 text-slate-100 rounded-md px-2 py-1 text-sm border border-slate-600"
                />
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={editNights}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val > 3) val = 3;
                    else if (val < 1) val = 1;
                    setEditNights(val);
                  }}
                  className="bg-slate-800 text-slate-100 rounded-md px-2 py-1 text-sm border border-slate-600 w-20"
                  placeholder="nights"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <h2 className="text-white font-semibold">
                {item.campground.name}
              </h2>
              <p className="text-sm text-slate-400">
                📍 {item.campground.address}
              </p>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <Calendar size={14} /> {item.bookingDate.split("T")[0]}
                <span className="font-semibold text-white">
                  {item.nights} night{item.nights > 1 ? "s" : ""}
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {editingId === item._id ? (
              <>
                <button
                  onClick={() => handleEditSave(item._id)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-600 text-green-400 text-sm hover:border-green-400 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-600 text-slate-400 text-sm hover:border-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleEditStart(item)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 text-orange-400 text-sm hover:bg-slate-700 transition-colors"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 text-red-400 text-sm hover:bg-slate-700 transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
