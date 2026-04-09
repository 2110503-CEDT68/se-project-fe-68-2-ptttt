import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { redirect } from "next/navigation";
import { BookingItem, CampgroundItem } from "../../../interface";
import AdminPanel from "@/components/AdminPanel";

async function getAllBookings(token: string) {
  const response = await fetch(`${process.env.BACKEND_URL}/api/v1/bookings`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch bookings");
  return await response.json();
}

async function getAllCampgrounds() {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/campgrounds`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Failed to fetch campgrounds");
  return await response.json();
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/authentication");
  if (session.user.role !== "admin") redirect("/");

  const [bookingsRes, campgroundsRes] = await Promise.all([
    getAllBookings(session.user.token),
    getAllCampgrounds(),
  ]);

  const bookings: BookingItem[] = bookingsRes.data || [];
  const campgrounds: CampgroundItem[] = campgroundsRes.data || [];

  return (
    <div className="min-h-screen py-10 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <span className="px-4 py-2 rounded-lg border border-orange-400 text-orange-400 text-sm font-medium">
            Administrator
          </span>
        </div>
        <AdminPanel
          bookings={bookings}
          campgrounds={campgrounds}
          token={session.user.token}
        />
      </div>
    </div>
  );
}
