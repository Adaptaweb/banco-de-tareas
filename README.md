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

## Deploy en Raspberry Pi 5 (Pi OS) + CasaOS

Requiere Docker con el plugin `docker compose` (si CasaOS ya está instalado,
Docker viene incluido; si no, instalar con `curl -fsSL https://get.docker.com | sh`).

```bash
cd /home/alejandro   # o la carpeta que uses
git clone https://github.com/Adaptaweb/banco-de-tareas.git
cd banco-de-tareas

# Buildear imagen (nativo arm64, corre directo en la Pi)
docker build -t banco-de-tareas:latest .

# Primer arranque
docker compose up -d
```

Los datos persistentes (base de datos SQLite y fotos del slideshow) viven
en `/DATA/AppData/BancoTareas/data` y `/DATA/AppData/BancoTareas/slideshow`
en el host — Docker crea esas carpetas solo. El resto del contenedor (código,
`node_modules`) es descartable y se reconstruye en cada deploy, no requiere
copiarse a mano.

Para editar `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID` y `HA_IP`: desde el panel
de CasaOS (Custom App → variables de entorno) o directo en
`docker-compose.yml` antes de levantar.

### Actualizar

```bash
cd /home/alejandro/banco-de-tareas
chmod +x deploy.sh
./deploy.sh
```

Esto hace `git pull`, reconstruye la imagen y recrea el contenedor
conservando los datos (`docker compose up -d` detecta la imagen nueva y
reemplaza el contenedor solo).

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
