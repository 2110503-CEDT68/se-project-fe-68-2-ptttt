"use server";

export default async function createBooking(
  token: string,
  cid: string,
  bookingDate: string,
  nights: number,
) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/campgrounds/${cid}/bookings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingDate, nights }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.msg || errorData.message || "Failed to create booking",
    );
  }

  return await response.json();
}
