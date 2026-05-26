export async function POST(request: Request) {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password)
    return Response.json({ error: "Gebruikersnaam en wachtwoord verplicht" }, { status: 400 });
  return Response.json({
    token: "mock-syntess-demo-token-2026",
    expiresIn: "8h",
    user: { username, role: "admin" },
  });
}
