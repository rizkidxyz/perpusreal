import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  // Verifikasi di sini (Node runtime) memakai env yang sama dengan signToken,
  // berbeda dengan middleware Edge yang bisa membaca nilai env lama saat build.
  if (await getUser()) redirect('/dashboard');
  return children;
}
