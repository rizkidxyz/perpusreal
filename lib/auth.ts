import { cookies } from 'next/headers';
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import type { User } from './api';

export const COOKIE = 'perpus_session';
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

export async function signToken(user: User) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret());
}

export async function verifyToken(token?: string): Promise<User | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as User;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export async function getToken() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value || '';
}
