import Link from "next/link";
import getCampground from "@/libs/getCampground";
import BookingForm from "@/components/BookingForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import getMyBookings from "@/libs/getMyBookings";
import getUserProfile from "@/libs/getUserProfile";
import { MapPin, Phone } from "lucide-react";

export default async function CampgroundDetailPage({
  params,
}: {
  params: Promise<{ cid: string }>;
}) {
  const resolvedParams = await params;
  const campgroundResponse = await getCampground(resolvedParams.cid);
  const campground = campgroundResponse.data;

  const session = await getServerSession(authOptions);
  let alreadyBooked = false;
  let maxBookingReached = false;
  if (session?.user?.token) {
    try {
      const profile = await getUserProfile(session.user.token);
      const isUser = profile.data.role === "user";
      if (isUser) {
        const res = await getMyBookings(session.user.token);
        const today = new Date().toISOString().split("T")[0];
        const activeBookings = res.data.filter(
          (b: any) =>
            new Date(b.bookingDate).toISOString().split("T")[0] >= today,
        );
        alreadyBooked = activeBookings.some(
          (b: any) => b.campground._id === campground._id,
        );
        maxBookingReached = activeBookings.length >= 3;
      }
    } catch {}
  }

  // Handle case where campground is not found
  if (!campground) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-200 mb-4">
          Campground not found
        </h1>
        <Link href="/campground" className="text-orange-400 hover:underline">
          &larr; Back to all campgrounds
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Navigation */}
        <Link
          href="/campground"
          className="inline-flex items-center text-orange-400 hover:text-orange-300 font-medium transition-colors"
        >
          <span className="mr-2">&larr;</span> Back to Campgrounds
        </Link>

        {/* Main Content Card */}
        <div className="bg-[#12172a] rounded-2xl overflow-hidden border border-slate-700/50">
          {/* Hero Image Section */}
          <div className="relative w-full aspect-video bg-slate-800">
            <img
              src={campground.picture}
              alt={campground.name}
              className="object-cover w-full h-full"
            />
          </div>

          {/* Details Section */}
          <div className="p-8 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 mb-6">
              {campground.name}
            </h1>

            <div className="space-y-4">
              {/* Address */}
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <MapPin size={20} className="text-orange-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Address
                  </h3>
                  <p className="mt-1 text-lg text-slate-200 leading-relaxed">
                    {campground.address}
                  </p>
                </div>
              </div>

              {/* Telephone */}
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <Phone size={20} className="text-orange-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Contact Number
                  </h3>
                  <p className="mt-1 text-lg text-slate-200">
                    {campground.tel}
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <div className="mt-10 pt-8 border-t border-slate-700/50">
              <BookingForm
                campground={campground}
                alreadyBooked={alreadyBooked || maxBookingReached}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
