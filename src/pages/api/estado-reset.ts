import type { APIRoute } from 'astro';
import { getState } from '../../lib/telegram';
import { loadState, saveState } from '../../lib/db';

export const GET: APIRoute = async () => {
  const s = getState();
  const db = loadState();
  s.estado_mision = 'esperando';
  saveState(s.fecha_actual, s.tiempo_hoy, s.tareas_aprobadas, db.tareas_activas, 'esperando');
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
