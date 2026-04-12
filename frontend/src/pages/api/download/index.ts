import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

export const GET: APIRoute = async () => {
  try {
    const zipPath = resolve(process.cwd(), 'public/plugin.zip');

    try {
      const file = await readFile(zipPath);
      return new Response(file, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="contentai-plugin.zip"',
          'Content-Length': String(file.length),
        },
      });
    } catch {
      // Plugin ZIP not built yet
      return new Response(JSON.stringify({
        error: 'Plugin not available',
        message: 'Plugin ZIP chưa được build. Chạy: node scripts/download-plugin.mjs',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
