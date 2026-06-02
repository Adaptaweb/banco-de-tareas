import type { APIRoute } from 'astro';
import { getState, setMissionState } from '../../lib/telegram';

export const GET: APIRoute = async () => {
  const s = getState();
  setMissionState('esperando');
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
