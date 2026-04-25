"use server";

export default async function getReviews(campgroundId: string) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/campgrounds/${campgroundId}/reviews`,
    { cache: "no-store" },
  );

  if (!response.ok) throw new Error("Failed to fetch reviews");
  return await response.json();
}
