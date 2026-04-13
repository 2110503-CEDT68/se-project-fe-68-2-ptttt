"use server";

export default async function updateCampground(
  token: string,
  id: string,
  name: string,
  address: string,
  tel: string,
  picture: string,
) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/campgrounds/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, address, tel, picture }),
    },
  );

  if (!response.ok) throw new Error("Failed to update campground");
  return await response.json();
}