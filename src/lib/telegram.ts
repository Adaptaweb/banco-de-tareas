import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { loadState, saveState, saveDailyHistory, getConfig } from './db.js';

const TOKEN = process.env.TELEGRAM_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

function getHaIp(): string {
  return getConfig('ha_ip_active') || process.env.HA_IP || '192.168.3.99';
}

export function formatoTiempo(minutos: number): string {
  if (minutos < 60) return `${minutos} Minutos`;
  const horas = Math.floor(minutos / 60);
  const restante = minutos % 60;
  return restante === 0 ? `${horas}h` : `${horas} Horas y ${restante} Minutos`;
}

export interface AppState {
  estado_mision: string;
  tiempo_hoy: number;
  tareas_aprobadas: string[];
  fecha_actual: string;
}

// In-memory state (same pattern as Flask original, but could be fully DB-driven)
let state: AppState = {
  estado_mision: 'esperando',
  tiempo_hoy: 0,
  tareas_aprobadas: [],
  fecha_actual: new Date().toISOString().slice(0, 10),
};

export function getState(): AppState {
  return state;
}

export function setMissionState(val: string) {
  state.estado_mision = val;
}

export function resetState() {
  state.estado_mision = 'esperando';
}

export function reloadFromDb() {
  const db = loadState();
  const hoy = new Date().toISOString().slice(0, 10);

  console.log('[reloadFromDb] db.fecha:', db.fecha, 'db.estado_mision:', db.estado_mision, 'db.tiempo:', db.tiempo_hoy, 'db.aprobadas:', JSON.stringify(db.tareas_aprobadas), 'hoy:', hoy, 'reset?', hoy !== db.fecha);
  // Daily reset check
  if (hoy !== db.fecha) {
    saveDailyHistory(state.fecha_actual, state.tiempo_hoy, state.tareas_aprobadas);
    state.tareas_aprobadas = [];
    state.tiempo_hoy = 0;
    state.fecha_actual = hoy;
    state.estado_mision = 'esperando';
    saveState(hoy, 0, [], db.tareas_activas, 'esperando');
    console.log('🔄 Nuevo día detectado: Misiones reiniciadas.');
  }

  state.tareas_aprobadas = db.tareas_aprobadas;
  state.tiempo_hoy = db.tiempo_hoy;
  state.fecha_actual = db.fecha;
  state.estado_mision = db.estado_mision;
}

export function startBot() {
  if (!TOKEN || !CHAT_ID) {
    console.log('⚠️ TELEGRAM_TOKEN o TELEGRAM_CHAT_ID no configurados. Bot desactivado.');
    return;
  }

  const bot = new Telegraf(TOKEN);

  // We don't use bot.command/h Hear  n directly since we use long-polling
  // with getUpdates pattern matching the original Flask implementation.
  // Telegraf handles polling internally.

  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const msg = ctx.callbackQuery.message;
    if (!msg) return;

    const hoy = new Date().toISOString().slice(0, 10);

    if (data?.startsWith('ok|')) {
      const tareaNombre = data.split('|')[1];

      // Daily check inside callback
      if (hoy !== state.fecha_actual) {
        saveDailyHistory(state.fecha_actual, state.tiempo_hoy, state.tareas_aprobadas);
        state.tareas_aprobadas = [];
        state.tiempo_hoy = 0;
        state.fecha_actual = hoy;
      }

      console.log('[BOT ok|] tareas_aprobadas:', JSON.stringify(state.tareas_aprobadas), 'incluye?', state.tareas_aprobadas.includes(tareaNombre), 'tarea:', tareaNombre, 'estado_mision:', state.estado_mision, 'fecha_actual:', state.fecha_actual, 'hoy:', hoy);
      if (!state.tareas_aprobadas.includes(tareaNombre)) {
        state.tareas_aprobadas.push(tareaNombre);

        const dbState = loadState();
        const task = dbState.tareas_activas.find(t => t.nombre === tareaNombre);
        const minutosGanados = task?.tiempo || 0;
        const numTasks = dbState.tareas_activas.length;
        state.tiempo_hoy += minutosGanados;

        state.estado_mision = 'aprobada';
        saveState(state.fecha_actual, state.tiempo_hoy, state.tareas_aprobadas, dbState.tareas_activas, 'aprobada');
        saveDailyHistory(state.fecha_actual, state.tiempo_hoy, state.tareas_aprobadas);

        // Home Assistant webhook
        const haIp = getHaIp();
        try {
          await fetch(`http://${haIp}:8123/api/webhook/mision_aprobada_matias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tarea: tareaNombre, minutos: minutosGanados }),
            signal: AbortSignal.timeout(2000),
          });

          if (state.tareas_aprobadas.length === numTasks && numTasks > 0) {
            await fetch(`http://${haIp}:8123/api/webhook/meta_alcanzada_matias`, {
              method: 'POST',
              signal: AbortSignal.timeout(2000),
            });
          }
        } catch (e) {
          console.log('Error contacting Home Assistant:', e);
        }
      }

      await ctx.editMessageText(`✅ APROBADA: ${tareaNombre}`);
      await ctx.answerCbQuery();
    } else if (data === 'no') {
      if (hoy !== state.fecha_actual) {
        saveDailyHistory(state.fecha_actual, state.tiempo_hoy, state.tareas_aprobadas);
        state.tareas_aprobadas = [];
        state.tiempo_hoy = 0;
        state.fecha_actual = hoy;
      }

      state.estado_mision = 'rechazada';
      await ctx.editMessageText('❌ RECHAZADA');
      await ctx.answerCbQuery();

      const dbNo = loadState();
      saveState(state.fecha_actual, dbNo.tiempo_hoy, dbNo.tareas_aprobadas, dbNo.tareas_activas, 'rechazada');
    }

    if (data !== 'no' && !data?.startsWith('ok|')) {
      await ctx.answerCbQuery();
    }
  });

  bot.launch({ dropPendingUpdates: true });
  console.log('🚀 Bot de Telegram iniciado (long-polling)...');

  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
