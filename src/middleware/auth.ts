import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifySessionToken } from '../lib/auth';
import { Env, SessionUser } from '../types';

// Extend Hono context variables
declare module 'hono' {
  interface ContextVariableMap {
    user: SessionUser;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const sessionCookie = getCookie(c, 'phut_session');

  if (!sessionCookie) {
    return c.json({ error: 'Not authenticated', login: '/auth/login' }, 401);
  }

  const user = await verifySessionToken(sessionCookie, c.env.SESSION_SECRET);
  if (!user) {
    return c.json({ error: 'Session expired', login: '/auth/login' }, 401);
  }

  c.set('user', user);
  await next();
}
