import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  decodeJwtPayload,
  createSessionToken,
} from '../lib/auth';
import { Env, SessionUser } from '../types';

const auth = new Hono<{ Bindings: Env }>();

// Redirect to Entra ID login
auth.get('/login', (c) => {
  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/auth/callback`;

  // Generate random state for CSRF protection
  const state = crypto.randomUUID();
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  const url = getAuthorizationUrl(c.env, redirectUri, state);
  return c.redirect(url);
});

// Entra ID callback
auth.get('/callback', async (c) => {
  const { code, state, error, error_description } = c.req.query();

  if (error) {
    return c.html(
      `<h1>Authentication Error</h1><p>${error}: ${error_description}</p><a href="/auth/login">Try again</a>`,
      400
    );
  }

  if (!code || !state) {
    return c.redirect('/auth/login');
  }

  // Verify state
  const savedState = c.req.header('cookie')
    ?.split(';')
    .find((s) => s.trim().startsWith('oauth_state='))
    ?.split('=')[1]
    ?.trim();

  if (state !== savedState) {
    return c.html('<h1>Invalid state parameter</h1><a href="/auth/login">Try again</a>', 400);
  }

  // Exchange code for tokens
  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/auth/callback`;

  try {
    const tokens = await exchangeCodeForTokens(c.env, code, redirectUri);
    const claims = decodeJwtPayload(tokens.id_token);

    // Verify tenant
    const tid = claims.tid;
    if (tid !== c.env.ENTRA_TENANT_ID) {
      return c.html('<h1>Access Denied</h1><p>Your tenant is not authorized.</p>', 403);
    }

    // Build session user
    const sessionUser: SessionUser = {
      sub: claims.oid || claims.sub,
      email: claims.preferred_username || claims.email || '',
      name: claims.name || claims.preferred_username || 'User',
      exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
    };

    // Create signed session cookie
    const sessionToken = await createSessionToken(sessionUser, c.env.SESSION_SECRET);

    // Clear oauth state cookie
    deleteCookie(c, 'oauth_state', { path: '/' });

    // Set session cookie
    setCookie(c, 'phut_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 86400 * 7, // 7 days
      path: '/',
    });

    return c.redirect('/');
  } catch (err: any) {
    console.error('Auth callback error:', err);
    return c.html(
      `<h1>Authentication Failed</h1><p>${err.message}</p><a href="/auth/login">Try again</a>`,
      500
    );
  }
});

// Logout
auth.get('/logout', (c) => {
  deleteCookie(c, 'phut_session', { path: '/' });

  const logoutUrl = `https://login.microsoftonline.com/${c.env.ENTRA_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(new URL(c.req.url).origin)}`;
  return c.redirect(logoutUrl);
});

// Current user info (called by frontend)
auth.get('/me', async (c) => {
  const { verifySessionToken } = await import('../lib/auth');
  const cookie = c.req.header('cookie')
    ?.split(';')
    .find((s) => s.trim().startsWith('phut_session='))
    ?.split('=')
    .slice(1)
    .join('=')
    ?.trim();

  if (!cookie) {
    return c.json({ authenticated: false }, 401);
  }

  const user = await verifySessionToken(cookie, c.env.SESSION_SECRET);
  if (!user) {
    return c.json({ authenticated: false }, 401);
  }

  return c.json({ authenticated: true, user });
});

export default auth;
