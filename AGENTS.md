# Banco de Tareas — AGENTS.md

## Quick start

```bash
npm install
cp .env.example .env   # fill TELEGRAM_TOKEN + TELEGRAM_CHAT_ID + HA_IP
npm run dev            # Astro dev server on http://0.0.0.0:5000
# In another terminal:
npx tsx src/telegram-bot.ts   # Telegram bot daemon
```

For production (Docker):
```bash
docker build -t banco-de-tareas .
docker run -d -p 5000:5000 --env-file .env --name banco banco-de-tareas
```

## Architecture

**Astro SSR** (Node adapter, `standalone` mode) — single project, single repo.
**Stack** — SQLite via `better-sqlite3`, Telegraf bot, Home Assistant webhooks.
**Two processes** — Astro web server + Telegram bot (separate `npx tsx src/telegram-bot.ts`).
**Persistence** — `datos_cajero.db` auto-created. Legacy `datos_cajero.json` migrated once then ignored.

## Key gotchas

- `npm run build` only compiles Astro pages — **not** the bot. Production bot runs via `npx tsx` (Docker CMD). The `npm start` script (`node dist/telegram-bot.js`) will **fail** because bot is never pre-compiled.
- **Bot state machine**: `esperando → enviada → aprobada | rechazada → esperando` (reset via `/api/estado-reset`). State lives in-memory in `telegram.ts` + persisted to SQLite.
- **Polling**: Client polls `/api/estado` every 1.5s (3s on network error). Page is replaced via `innerHTML` on status change, not navigated.
- **Audio autoplay**: Browsers block autoplay. Code uses a click/touch handler (`habilitarAudio()`) to unmute audio elements after first user gesture. Any new sounds must follow this pattern.
- **Locale**: Clock uses `es-CL` (Chilean Spanish) formatting. All UI text is in Spanish.
- **Daily reset**: On first request after midnight, `reloadFromDb()` archives current day to `historial_diario` table and clears state.

## Key routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Kid's main view |
| `/admin` | GET | Parent task admin |
| `/historial` | GET | Daily history (timeline view) |
| `/api/mandar?tarea=` | GET | Submit task, sends Telegram message |
| `/api/estado` | GET | Poll current state + progress |
| `/api/estado-reset` | GET | Reset state, return to menu |
| `/api/modificar-tareas` | POST | Add/remove tasks (JSON body) |
| `/api/slideshow-images` | GET | List images from `public/slideshow/` |
| `/api/historial` | GET | JSON history data |

## Telegram bot

- Runs separately via `npx tsx src/telegram-bot.ts`. Long-polling with Telegraf.
- Callback data: `ok|<task_name>` (approve) or `no` (reject).
- Approval grants `120 // num_tasks` minutes of screen time.
- Home Assistant webhooks fire to `HA_IP:8123`.

## Themes

CSS custom properties swapped via `localStorage('temaBanco')`. Two themes:
- **minecraft** (default) — stone panels, gray beveled buttons (Minecraft Java Edition menu), Minecraftia font, panoramic background `images/minecraft/fondo_titulo.webp`. Class: `body.theme-minecraft`.
- **mario** — red surfaces, yellow gold, Press Start 2P + Exo 2 fonts, vault grid background. Class: `body.theme-mario`.

`BaseLayout.astro` SSR renders `<body class="theme-minecraft">` — JS `aplicarTema()` in inline script clears and sets the correct class. The `:root` colors match the Minecraft theme as fallback. Mario overrides via `body.theme-mario` selectors.

Audio files per theme in `public/sounds/{theme}/`. Theme switching swaps audio `src` via `a.load()`.

## Slideshow

Idle 60s triggers fullscreen image show from `public/slideshow/`. Ken Burns zoom animation. Any user interaction dismisses it.

## Constraints

- `.env`, `datos_cajero.db` are gitignored.
- Requires `tsx` at runtime for the Telegram bot.
- `better-sqlite3` needs native build tools (`python3 make g++`) on Alpine.
- No test framework. Verify with `npm run build`.
- Docker: multi-stage build, `build` stage compiles Astro, `runtime` stage runs bot + web via `concurrently`.
