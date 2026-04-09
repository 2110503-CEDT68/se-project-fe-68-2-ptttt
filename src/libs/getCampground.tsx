export default async function getCampground(id: string) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/campgrounds/${id}`,
    {
      method: "GET",
      // Add next tags for on-demand revalidation if needed
      next: { tags: ["campground"] },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch campground");
  }

  return await response.json();
}
