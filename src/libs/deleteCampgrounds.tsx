"use server";

export default async function deleteCampground(token: string, id: string) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/campgrounds/${id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) throw new Error("Failed to delete campground");
  return await response.json();
}
