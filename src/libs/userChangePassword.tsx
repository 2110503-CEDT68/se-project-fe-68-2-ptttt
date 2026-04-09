"use server";

export default async function userChangePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
) {
  const response = await fetch(
    `${process.env.BACKEND_URL}/api/v1/auth/changePassword`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: currentPassword,
        newPassword: newPassword,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.msg || errorData.message || "Failed to change password",
    );
  }

  return await response.json();
}
