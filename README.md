# Banco de Tareas

Sistema gamificado para que niños gestionen sus tareas del hogar y ganen tiempo de pantalla. Los niños envían tareas desde una interfaz tipo videojuego (temática Minecraft/Mario), los padres las aprueban o rechazan vía Telegram, y el tiempo de pantalla se acumula automáticamente.

## Stack

- **Astro SSR** (Node adapter, standalone mode)
- **SQLite** via `better-sqlite3`
- **Telegraf** (Telegram bot API)
- **Home Assistant** webhooks (integración opcional)
- **TypeScript**

## Requisitos

- Node.js 20+
- npm

## Configuración

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

| Variable | Descripción |
|---|---|
| `TELEGRAM_TOKEN` | Token de tu bot de Telegram (de @BotFather) |
| `TELEGRAM_CHAT_ID` | ID del chat donde el bot enviará mensajes |
| `HA_IP` | IP de tu Home Assistant (opcional, para webhooks) |

## Desarrollo

```bash
npm install
npm run dev      # Servidor web en http://localhost:5000

# En otra terminal:
npx tsx src/telegram-bot.ts   # Bot de Telegram
```

## Producción (Docker)

```bash
docker build -t banco-de-tareas .
docker run -d -p 5000:5000 --env-file .env --name banco banco-de-tareas
```

## Deploy en Casa OS (Raspberry Pi)

```bash
cd /home/alejandro
git clone https://github.com/Adaptaweb/banco-de-tareas.git
cd banco-de-tareas

# Buildear imagen
docker build -t banco-de-tareas:latest .

# Pre-poblar bind mount con runtime files
docker create --name temp banco-de-tareas:latest
mkdir -p /DATA/AppData/BancoTareas
docker cp temp:/app/. /DATA/AppData/BancoTareas/
docker rm temp

# Configurar compose en Casa OS (panel web → Custom App)
# Editar TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, HA_IP desde la UI
```

### Actualizar

Usar el script `deploy.sh`:

```bash
cd /home/alejandro/banco-de-tareas
chmod +x deploy.sh
./deploy.sh
```

O manualmente:

```bash
cd /home/alejandro/banco-de-tareas
git pull
docker build -t banco-de-tareas:latest .
docker create --name temp_deploy banco-de-tareas:latest
for dir in dist src node_modules public; do
  docker cp temp_deploy:/app/"$dir" /DATA/AppData/BancoTareas/
done
for f in astro.config.mjs package.json package-lock.json; do
  docker cp temp_deploy:/app/"$f" /DATA/AppData/BancoTareas/
done
docker rm temp_deploy
docker compose down
docker compose up -d
```

## Rutas principales

| Ruta | Método | Propósito |
|---|---|---|
| `/` | GET | Vista principal del niño |
| `/admin` | GET | Panel de administración para padres |
| `/historial` | GET | Historial diario (línea de tiempo) |
| `/api/mandar?tarea=` | GET | Enviar tarea, notifica por Telegram |
| `/api/estado` | GET | Consultar estado + progreso actual |
| `/api/estado-reset` | GET | Resetear estado, volver al menú |
| `/api/modificar-tareas` | POST | Agregar/eliminar tareas (JSON) |

## Cómo funciona

1. El niño selecciona una tarea desde la interfaz principal
2. Se envía una notificación al padre vía Telegram con botones **Aprobar / Rechazar**
3. Si el padre aprueba, se acredita el tiempo de pantalla correspondiente
4. El tiempo se calcula como `120 / número_de_tareas` minutos por tarea
5. Al completar todas las tareas del día, se dispara un webhook opcional a Home Assistant

## Temas

- **Minecraft** (default) — Paneles de piedra, botones grises, fuente Minecraftia
- **Mario** — Superficies rojas/doradas, fuente Press Start 2P

## Slideshow

Si el niño está inactivo 60 segundos, se activa un slideshow a pantalla completa con imágenes de `public/slideshow/` y efecto Ken Burns. Cualquier interacción lo cierra.

## Licencia

MIT
