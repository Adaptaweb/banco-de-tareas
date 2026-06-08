import { getConfig } from './db';

function getHaBaseUrl(): string {
  const ip = getConfig('ha_ip_active') || process.env.HA_IP || '192.168.3.99';
  return `http://${ip}:8123`;
}

export async function notifyMissionApproved(tarea: string, minutos: number) {
  try {
    await fetch(`${getHaBaseUrl()}/api/webhook/mision_aprobada_matias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarea, minutos }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    console.log('Home Assistant not reachable (mision_aprobada_matias)');
  }
}

export async function notifyMetaAlcanzada() {
  try {
    await fetch(`${getHaBaseUrl()}/api/webhook/meta_alcanzada_matias`, {
      method: 'POST',
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    console.log('Home Assistant not reachable (meta_alcanzada_matias)');
  }
}
