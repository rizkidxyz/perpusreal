export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ ok: true, ts: Date.now(), socket: !!(globalThis as any).io });
}
