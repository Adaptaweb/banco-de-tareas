import type { APIRoute } from 'astro';
import { addTask, removeTask, updateTask, loadState } from '../../lib/db';
import { reloadFromDb } from '../../lib/telegram';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const accion = data.accion as string;
  const nombre = data.nombre as string;

  if (accion === 'agregar' && nombre) {
    const icono = data.icono || '📌';
    const tiempo = data.tiempo ? parseInt(data.tiempo, 10) : 15;
    const db = loadState();
    if (!db.tareas_activas.some(t => t.nombre === nombre)) {
      addTask(nombre, icono, tiempo);
    }
  } else if (accion === 'quitar' && nombre) {
    removeTask(nombre);
  } else if (accion === 'editar_tarea' && nombre) {
    const nuevoNombre = (data.nuevo_nombre || nombre).trim();
    const icono = data.icono || '📌';
    const tiempo = parseInt(data.tiempo, 10);
    if (tiempo > 0 && nuevoNombre) {
      updateTask(nombre, nuevoNombre, icono, tiempo);
    }
  }

  reloadFromDb();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
