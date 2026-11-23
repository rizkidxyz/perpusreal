import { SignJWT, jwtVerify } from 'jose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const base = { ok: true, ts: Date.now(), socket: !!(globalThis as any).io };
  const url = new URL(req.url);
  if (url.searchParams.get('debug') !== '1') return Response.json(base);

  // Diagnostik tanpa membocorkan nilai rahasia — hanya status boolean.
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const key = new TextEncoder().encode(secret);
  const raw = req.headers.get('cookie') || '';
  const found = raw.match(/(?:^|;\s*)perpus_session=([^;]+)/);
  const token = found ? decodeURIComponent(found[1]) : '';

  let verifyOk = false;
  try { if (token) { await jwtVerify(token, key); verifyOk = true; } } catch { /* cookie invalid */ }

  let roundtripOk = false;
  try {
    const probe = await new SignJWT({ id: 'diagnostic' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1m')
      .sign(key);
    await jwtVerify(probe, key);
    roundtripOk = true;
  } catch { /* crypto tidak tersedia */ }

  return Response.json({
    ...base,
    env: {
      appsScriptUrl: !!process.env.APPS_SCRIPT_URL,
      apiSecret: !!process.env.API_SECRET,
      jwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: secret.length,
    },
    cookie: { present: !!token, length: token.length },
    auth: { verifyOk, roundtripOk },
  });
}
