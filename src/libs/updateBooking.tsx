"use server";

export default async function updateBooking(
  token: string,
  bookingId: string,
  bookingDate: string,
  nights: number,
) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/bookings/${bookingId}`,
    {
      method: "PUT",
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
      errorData.msg || errorData.message || "Failed to update booking",
    );
  }

  return await response.json();
}
