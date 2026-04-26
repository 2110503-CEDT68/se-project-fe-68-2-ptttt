"use server";

export default async function deleteReview(token: string, reviewId: string) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/reviews/${reviewId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.msg || "Failed to delete review");
  }

  return await response.json();
}
