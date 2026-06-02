import type { APIRoute } from 'astro';
import { loadState } from '../../lib/db';
import { getState, reloadFromDb, formatoTiempo } from '../../lib/telegram';

export const GET: APIRoute = async () => {
  reloadFromDb();
  const s = getState();
  const db = loadState();

  return new Response(
    JSON.stringify({
      valor: s.estado_mision,
      tiempo: s.tiempo_hoy,
      tiempo_formato: formatoTiempo(s.tiempo_hoy),
      aprobadas: s.tareas_aprobadas,
      total_tareas: db.tareas_activas.length,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
