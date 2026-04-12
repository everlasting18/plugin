import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code } = await request.json();
    const PB_URL = 'https://8qj9xau0f6ama5b.591p.pocketbasecloud.com';

    // Exchange OAuth code for auth token
    const res = await fetch(`${PB_URL}/api/auth/oauth2/callback/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        codeVerifier: '',
        redirectUrl: new URL(request.url).origin + '/auth/callback',
      }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Auth failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();

    // Set auth cookie and redirect
    return new Response(JSON.stringify({ success: true, user: data.user }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `pb_auth=${data.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
