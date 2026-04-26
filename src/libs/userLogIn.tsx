export default async function userLogIn(
  userEmail: string,
  userPassword: string,
) {
  const response = await fetch(`${process.env.BACKEND_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: userEmail,
      password: userPassword,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to log-in");
  }

  const data = await response.json();

  //get user profile
  const profileRes = await fetch(`${process.env.BACKEND_URL}/api/v1/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${data.token}` },
  });

  const profile = await profileRes.json();

  return {
    ...data,
    _id: profile.data._id,
    role: profile.data.role,
    name: profile.data.name,
    email: profile.data.email,
  };
}
