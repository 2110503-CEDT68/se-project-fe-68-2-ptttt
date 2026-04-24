"use server";

export default async function createReview(
  token: string,
  campgroundId: string,
  bookingId: string,
  rating: number,
  comment: string,
) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/campgrounds/${campgroundId}/reviews`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ booking: bookingId, rating, comment }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.msg || errorData.message || "Failed to create review",
    );
  }

  return await response.json();
}
