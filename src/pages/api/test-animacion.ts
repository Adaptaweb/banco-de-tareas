import type { APIRoute } from 'astro';
import { loadState, saveState, saveDailyHistory } from '../../lib/db';
import { getState, setMissionState } from '../../lib/telegram';

export const GET: APIRoute = async ({ url }) => {
  const accion = url.searchParams.get('accion');

  if (accion === 'aprobar') {
    setMissionState('aprobada');
    return new Response(JSON.stringify({ ok: true, valor: 'aprobada' }));
  }

  if (accion === 'rechazar') {
    setMissionState('rechazada');
    return new Response(JSON.stringify({ ok: true, valor: 'rechazada' }));
  }

  if (accion === 'meta') {
    const db = loadState();
    const s = getState();
    const hoy = new Date().toISOString().slice(0, 10);

    const todas = db.tareas_activas.map(t => t.nombre);
    const tiempoTotal = db.tareas_activas.reduce((sum, t) => sum + t.tiempo, 0);

    s.fecha_actual = hoy;
    s.tareas_aprobadas = todas;
    s.tiempo_hoy = tiempoTotal;

    saveState(hoy, tiempoTotal, todas, db.tareas_activas, 'aprobada');
    saveDailyHistory(hoy, tiempoTotal, todas);
    setMissionState('aprobada');

    return new Response(JSON.stringify({ ok: true, valor: 'aprobada', meta: true }));
  }

  return new Response(JSON.stringify({ ok: false, error: 'accion debe ser aprobar, rechazar o meta' }), { status: 400 });
};
