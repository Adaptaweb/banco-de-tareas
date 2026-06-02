import type { APIRoute } from 'astro';
import { getState } from '../../lib/telegram';
import { loadState, saveState } from '../../lib/db';

export const GET: APIRoute = async () => {
  const s = getState();
  const db = loadState();
  s.estado_mision = 'esperando';
  s.tareas_aprobadas = [];
  s.tiempo_hoy = 0;
  saveState(s.fecha_actual, 0, [], db.tareas_activas, 'esperando');
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
