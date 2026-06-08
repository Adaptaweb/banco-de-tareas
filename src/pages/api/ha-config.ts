import type { APIRoute } from 'astro';
import { getConfig, setConfig } from '../../lib/db';

export const GET: APIRoute = async () => {
  const listRaw = getConfig('ha_ip_list', '[]');
  let list: string[] = [];
  try { list = JSON.parse(listRaw); } catch { list = []; }

  const active = getConfig('ha_ip_active') || (list[0] ?? '');

  return new Response(JSON.stringify({ active, list }));
};

export const POST: APIRoute = async ({ request }) => {
  let body: { accion?: string; ip?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), { status: 400 });
  }

  const { accion, ip } = body;

  if (!accion || !ip) {
    return new Response(JSON.stringify({ ok: false, error: 'Faltan accion y/o ip' }), { status: 400 });
  }

  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return new Response(JSON.stringify({ ok: false, error: 'IP con formato inválido' }), { status: 400 });
  }

  const listRaw = getConfig('ha_ip_list', '[]');
  let list: string[] = [];
  try { list = JSON.parse(listRaw); } catch { list = []; }

  if (accion === 'agregar') {
    if (list.includes(ip)) {
      return new Response(JSON.stringify({ ok: false, error: 'La IP ya existe' }), { status: 400 });
    }
    list.push(ip);
    setConfig('ha_ip_list', JSON.stringify(list));
    if (list.length === 1) {
      setConfig('ha_ip_active', ip);
    }
  } else if (accion === 'activar') {
    if (!list.includes(ip)) {
      return new Response(JSON.stringify({ ok: false, error: 'La IP no está en la lista' }), { status: 400 });
    }
    setConfig('ha_ip_active', ip);
  } else if (accion === 'eliminar') {
    if (!list.includes(ip)) {
      return new Response(JSON.stringify({ ok: false, error: 'La IP no está en la lista' }), { status: 400 });
    }
    list = list.filter(i => i !== ip);
    setConfig('ha_ip_list', JSON.stringify(list));
    const currentActive = getConfig('ha_ip_active');
    if (currentActive === ip) {
      setConfig('ha_ip_active', list[0] ?? '');
    }
  } else {
    return new Response(JSON.stringify({ ok: false, error: 'Acción no válida' }), { status: 400 });
  }

  const active = getConfig('ha_ip_active') || (list[0] ?? '');
  return new Response(JSON.stringify({ ok: true, active, list }));
};
