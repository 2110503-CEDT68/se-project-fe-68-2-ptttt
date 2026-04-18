"use server";

export default async function createCampground(
  token: string,
  name: string,
  address: string,
  tel: string,
  picture: string,
) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/campgrounds`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, address, tel, picture }),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create campground");
  }
  return await response.json();
}