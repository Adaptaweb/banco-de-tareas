import type { APIRoute } from 'astro';
import { getHistory } from '../../lib/db';
import { formatoTiempo } from '../../lib/telegram';

export const GET: APIRoute = async () => {
  const historial = getHistory().map(r => ({
    ...r,
    tiempo_formato: formatoTiempo(r.tiempo_ganado),
  }));

  return new Response(JSON.stringify({ historial }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
