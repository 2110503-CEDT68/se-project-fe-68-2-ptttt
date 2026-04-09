"use server";

export default async function deleteBooking(token: string, bookingId: string) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/bookings/${bookingId}`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.msg || errorData.message || "Failed to delete booking",
    );
  }

  return await response.json();
}
