import BookingList from "@/components/BookingList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import getMyBookings from "@/libs/getMyBookings";
import { redirect } from "next/navigation";

export default async function MyBookingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.token) redirect("/authentication");

  let bookings = [];
  try {
    const res = await getMyBookings(session.user.token);
    const today = new Date().toISOString().split("T")[0];
    bookings = res.data.filter((b: any) => {
      const bookingDay = new Date(b.bookingDate).toISOString().split("T")[0];
      return bookingDay >= today;
    });
  } catch (err) {
    bookings = [];
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-6">My Bookings</h1>
        <BookingList bookings={bookings} token={session.user.token} />
      </div>
    </div>
  );
}
