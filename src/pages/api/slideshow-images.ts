import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadSlideshowImages, addSlideshowImage, removeSlideshowImage, toggleSlideshowImage, syncSlideshowFromFilesystem } from '../../lib/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDESHOW_DIR = path.resolve(__dirname, '../../../public/slideshow');

export const GET: APIRoute = async () => {
  const images = loadSlideshowImages(true).map(img => `/slideshow/${img.filename}`);
  return new Response(JSON.stringify({ images }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { accion } = body;

    switch (accion) {
      case 'upload': {
        const files: { filename: string; data: string }[] = body.files || [];
        if (!fs.existsSync(SLIDESHOW_DIR)) {
          fs.mkdirSync(SLIDESHOW_DIR, { recursive: true });
        }
        const uploaded: string[] = [];
        for (const f of files) {
          const sanitized = f.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = path.join(SLIDESHOW_DIR, sanitized);
          const buffer = Buffer.from(f.data, 'base64');
          fs.writeFileSync(filePath, buffer);
          addSlideshowImage(sanitized);
          uploaded.push(sanitized);
        }
        return new Response(JSON.stringify({ ok: true, uploaded }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        const id = body.id;
        if (id == null) {
          return new Response(JSON.stringify({ ok: false, error: 'id required' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          });
        }
        removeSlideshowImage(id);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'toggle': {
        const id = body.id;
        if (id == null) {
          return new Response(JSON.stringify({ ok: false, error: 'id required' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          });
        }
        toggleSlideshowImage(id);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'sync': {
        syncSlideshowFromFilesystem();
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ ok: false, error: `unknown action: ${accion}` }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
