"use server";

export default async function getMyBookings(token: string) {
  const response = await fetch(`${process.env.BACKEND_URL}/api/v1/bookings`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.msg || errorData.message || "Failed to fetch bookings",
    );
  }

  return await response.json();
}
