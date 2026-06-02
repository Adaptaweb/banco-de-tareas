import type { APIRoute } from 'astro';
import { Telegraf } from 'telegraf';

const TOKEN = process.env.TELEGRAM_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export const GET: APIRoute = async ({ url }) => {
  const tarea = url.searchParams.get('tarea');
  if (!tarea) {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  try {
    const bot = new Telegraf(TOKEN);
    await bot.telegram.sendMessage(CHAT_ID, `MISION RECIBIDA: ${tarea}`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'APROBAR ✅', callback_data: `ok|${tarea}` },
            { text: 'RECHAZAR ❌', callback_data: 'no' },
          ],
        ],
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Error desconocido' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
