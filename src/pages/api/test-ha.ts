import type { APIRoute } from 'astro';

const HA_IP = process.env.HA_IP || '192.168.3.99';
const BASE_URL = `http://${HA_IP}:8123`;

export const GET: APIRoute = async () => {
  const results: Record<string, string> = {};

  for (const [name, url, body] of [
    ['mision_aprobada', '/api/webhook/mision_aprobada_matias', { tarea: '🧪 Test Manual', minutos: 1 }],
    ['meta_alcanzada', '/api/webhook/meta_alcanzada_matias', null],
  ] as const) {
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(3000),
      });
      results[name] = res.ok ? 'ok' : `HTTP ${res.status}`;
    } catch (e: unknown) {
      results[name] = e instanceof Error ? e.message : 'unknown error';
    }
  }

  const ok = Object.values(results).every(v => v === 'ok');
  return new Response(JSON.stringify({ ok, results }));
};
