import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDESHOW_DIR = path.resolve(__dirname, '../../../public/slideshow');

const VALID_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export const GET: APIRoute = async () => {
  const images: string[] = [];

  if (fs.existsSync(SLIDESHOW_DIR)) {
    for (const f of fs.readdirSync(SLIDESHOW_DIR)) {
      if (VALID_EXTS.some(ext => f.toLowerCase().endsWith(ext))) {
        images.push(`/slideshow/${f}`);
      }
    }
  }

  return new Response(JSON.stringify({ images }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
