export default async function getCampgrounds() {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/campgrounds`,
    {
      method: "GET",
      // Add next tags for on-demand revalidation if needed
      next: { tags: ["campgrounds"] },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch campgrounds");
  }

  return await response.json();
}
