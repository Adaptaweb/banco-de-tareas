import type { APIRoute } from 'astro';
import { loadState, saveState, deleteDailyHistory } from '../../lib/db';
import { reloadFromDb } from '../../lib/telegram';

export const GET: APIRoute = async () => {
  const db = loadState();
  const hoy = new Date().toISOString().slice(0, 10);

  deleteDailyHistory(hoy);

  db.tareas_aprobadas = [];
  db.tiempo_hoy = 0;
  db.fecha = hoy;
  saveState(hoy, 0, [], db.tareas_activas);

  reloadFromDb();

  return new Response(JSON.stringify({ ok: true }));
};
