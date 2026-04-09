"use client";
import { useState } from "react";
import { BookingItem } from "../../interface";
import deleteBooking from "@/libs/deleteBooking";
import updateBooking from "@/libs/updateBooking";
import { useRouter } from "next/navigation";
import { Search, Pencil, Trash2, User, Mail, Calendar } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminBookingList({
  bookings,
  token,
}: {
  bookings: BookingItem[];
  token: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editNights, setEditNights] = useState(1);
  const [searchEmail, setSearchEmail] = useState("");

  const validBookings = bookings.filter((item) => item.user != null);

  const filteredBookings = validBookings.filter((item) =>
    item.user.email.toLowerCase().includes(searchEmail.toLowerCase()),
  );

  const handleDelete = async (bookingId: string) => {
    if (!confirm("Delete this booking?")) return;
    try {
      await deleteBooking(token, bookingId);
      toast.success("success");
      router.refresh();
    } catch {
      toast.error("failed");
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
      toast.success("success");
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search by user email..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-transparent border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-slate-500 text-sm"
        />
      </div>

      <p className="text-sm text-slate-400">
        Showing {filteredBookings.length} of {validBookings.length} bookings
      </p>

      {filteredBookings.length === 0 && (
        <div className="border border-slate-700/50 rounded-xl py-20 text-center text-slate-500 text-sm">
          No bookings found
        </div>
      )}

      {filteredBookings.map((item: BookingItem) => (
        <div
          key={item._id}
          className="border-b border-slate-700/50 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          {editingId === item._id ? (
            <div className="space-y-2 flex-1">
              <p className="text-white font-semibold">{item.campground.name}</p>
              <p className="text-sm text-slate-400">
                {item.user.name} ({item.user.email})
              </p>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
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
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <User size={14} /> {item.user.name}
                </p>
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <Mail size={14} /> {item.user.email}
                </p>
              </div>
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
                  onClick={() => handleDelete(item._id)}
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
