import Link from "next/link";
import getCampground from "@/libs/getCampground";
import BookingForm from "@/components/BookingForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import getMyBookings from "@/libs/getMyBookings";
import getUserProfile from "@/libs/getUserProfile";
import { MapPin, Phone, Star } from "lucide-react";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import getReviews from "@/libs/getReviews";

export default async function CampgroundDetailPage({
  params,
}: {
  params: Promise<{ cid: string }>;
}) {
  const resolvedParams = await params;
  const campgroundResponse = await getCampground(resolvedParams.cid);
  const campground = campgroundResponse.data;

  // Fetch reviews for this campground
  const reviewsResponse = await getReviews(resolvedParams.cid).catch(() => ({ data: [] }));
  const reviews = reviewsResponse.data ?? [];

  // Calculate average rating and breakdown from campground's stored stats
  // ratingCount index: 0 = 1-star, 1 = 2-star, ..., 4 = 5-star
  // fallback to 0 for campgrounds created before rating fields were added
  const averageRating =
    campground.countReview > 0
      ? campground.sumRating / campground.countReview
      : 0;

  const stats = {
    averageRating,
    totalReviews: campground.countReview ?? 0,
    starBreakdown: {
      5: campground.ratingCount?.[4] ?? 0,
      4: campground.ratingCount?.[3] ?? 0,
      3: campground.ratingCount?.[2] ?? 0,
      2: campground.ratingCount?.[1] ?? 0,
      1: campground.ratingCount?.[0] ?? 0,
    },
  };

  const session = await getServerSession(authOptions);
  let alreadyBooked = false;
  let maxBookingReached = false;
  let bookingIdsForCampground: string[] = [];
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
        bookingIdsForCampground = res.data
          .filter((b: any) => b.campground?._id === campground._id)
          .map((b: any) => b._id);
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

  // Build rating bar data from stats for rendering the breakdown chart
  const ratingData = [
    { stars: 5, count: stats.starBreakdown[5] },
    { stars: 4, count: stats.starBreakdown[4] },
    { stars: 3, count: stats.starBreakdown[3] },
    { stars: 2, count: stats.starBreakdown[2] },
    { stars: 1, count: stats.starBreakdown[1] },
  ];

  // Calculate percentage for progress bar width
  const maxCount = Math.max(...ratingData.map(item => item.count));
  const ratingDataWithPercentage = ratingData.map(item => ({
    ...item,
    barWidth: maxCount > 0 ? (item.count / maxCount) * 100 : 0
  }));

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

            {/* Rating Overview Section */}
            <div className="mb-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 sm:p-8">
    
              <div className="flex flex-col sm:flex-row items-start gap-8">
                {/* Left Side - Average Rating */}
                <div className="text-center sm:text-left">
                  <div className="text-6xl font-extrabold text-slate-100 mb-2">
                    {stats.averageRating.toFixed(1)}
                  </div>
                  <div className="flex gap-1 mb-2 justify-center sm:justify-start">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 ${
                          star <= Math.round(stats.averageRating)
                            ? "fill-orange-400 text-orange-400"
                            : "text-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-slate-400">
                    {stats.totalReviews} {stats.totalReviews === 1 ? "review" : "reviews"}
                  </div>
                </div>

                {/* Right Side - Star Breakdown Bars */}
                <div className="flex-1 w-full space-y-3">
                  {ratingDataWithPercentage.map((item) => (
                    <div key={item.stars} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12">
                        <span className="text-sm text-slate-300">
                          {item.stars}
                        </span>
                        <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                      </div>
                      <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 transition-all duration-300"
                          style={{ width: `${item.barWidth}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-slate-400 w-12 text-right">
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-10 pt-8 border-t border-slate-700/50"></div>

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

            {/* Rating Form */}
            <div className="mt-10 pt-8 border-t border-slate-700/50"></div>
            <ReviewForm
              campgroundId={campground._id}
              bookingIds={bookingIdsForCampground}
            />

            {/* Review List */}
            <div className="mt-8">
              <ReviewList
                reviews={reviews}
                currentUserId={session?.user?._id}
                token={session?.user?.token}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
