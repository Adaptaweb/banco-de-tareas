# Tema "Fede Vigevani" — Diseño

## Contexto

App de tareas gamificada para niño (Matías). Ya existe sistema de temas
seleccionables (Minecraft, Mario, Fifa 2026) implementado en:

- [`src/components/ThemeSelector.astro`](../../../src/components/ThemeSelector.astro) — dropdown que llama `cambiarTema(valor)`
- [`public/styles/global.css`](../../../public/styles/global.css) — variables CSS por tema (`body.theme-<nombre>`) + capa de fondo `.vault-bg` + capa de escena animada `.<tema>-scene`
- `public/images/<tema>/`, `public/sounds/<tema>/` — assets por tema

Se pidió un nuevo tema basado en el afiche del show "El Mundo de Fede
Vigevani" (19 dic, Claro Arena, Chile), con cuenta regresiva y música de
fondo. El niño sigue usando la app para tareas normalmente; el tema solo
cambia la piel visual/sonora cuando está seleccionado.

## Alcance

- Nuevo tema seleccionable `fede`, mismo patrón que los 3 temas existentes.
- Las tareas/misiones/XP siguen funcionando igual — no se toca lógica de
  `src/lib/db`, `src/pages/api/*`, ni el flujo de aprobación por Telegram.
- Cuenta regresiva al show, visible solo en este tema.
- Música de fondo con control de silencio, solo en este tema.
- Fuera de alcance: cambiar temas existentes, cambiar `ThemeSelector` UI
  general, lógica de tareas.

## Fecha objetivo

`2026-12-19T19:00:00-03:00` (hora Chile continental, sin considerar cambios
de horario de verano — fijo).

## Assets requeridos (el usuario los provee)

- `public/images/fede/poster.jpg` — el afiche
- `public/sounds/fede/musica.mp3` — canción de fondo

Si estos archivos no existen al momento de implementar, el tema debe
degradar sin romper: fondo cae a un gradiente de color (sin `background-image`
rota) y el botón de música queda deshabilitado/oculto si el `<audio>` no
carga (`onerror`).

## Componentes

### 1. Selector de tema

`ThemeSelector.astro` — agregar `<option value="fede">⚡ Fede Vigevani</option>`.
Sin cambios de lógica (`cambiarTema` ya es genérico, agrega/quita clase
`theme-<valor>` en `body` vía `src/lib/` o script existente — verificar y
reusar el mecanismo actual, no crear uno nuevo).

### 2. Tema visual (`global.css`)

Nuevo bloque `==================== FEDE VIGEVANI THEME ====================`
siguiendo el patrón de Mario/Fifa:

- `body.theme-fede` — variables: `--color-bg` azul oscuro casi negro,
  `--color-gold` blanco/amarillo eléctrico para acentos de texto, colores de
  superficie rojo/azul translúcidos evocando la bandera chilena y el efecto
  dueto rojo/azul del afiche, `--font-display: 'Bebas Neue', sans-serif`
  (ya cargada por el tema Fifa vía Google Fonts — reusar, no duplicar import).
- `body.theme-fede .vault-bg` — `background: url('/images/fede/poster.jpg')
  center / cover no-repeat`. `.vault-bg::after` con overlay degradado
  rojo/azul + oscurecido (para legibilidad del `.card` de tareas encima).
- `.fede-scene` (oculta por defecto, `display:block` solo en
  `body.theme-fede`, mismo patrón que `.fifa-scene`/`.mario-scene`):
  rayos eléctricos (`.fede-bolt`) que destellan en posiciones aleatorias
  con `@keyframes fede-flash` (opacity pulse), y chispas/partículas
  flotantes sutiles. Reusa filosofía de las otras escenas (elementos
  absolutos, `pointer-events:none`, animación CSS pura, sin JS de física).
- Botones/inputs/`.card::after` con la misma cobertura que los otros temas
  (hover, disabled, focus) para no romper accesibilidad visual del resto
  de la UI.
- Entrada en `body.slow-device.theme-fede` (como los otros temas) que
  oculta `.fede-scene` y usa `.vault-bg` estático sin overlay animado,
  siguiendo el patrón de degradación para dispositivos lentos ya presente
  en el archivo (líneas ~80-98).

### 3. Contador (`Countdown.astro`)

Nuevo componente, montado en `index.astro` junto al `.clock-display`
existente, pero solo visible cuando el tema activo es `fede` (controlado
por CSS: `display:none` por defecto, `body.theme-fede & { display:flex }`,
mismo mecanismo que `.fede-scene`).

- Markup: `DÍAS`, `HORAS`, `MIN`, `SEG` en 4 bloques tipo "flip counter",
  con el label del show arriba ("EL MUNDO DE FEDE VIGEVANI — CLARO ARENA").
- Script vanilla (mismo patrón que `actualizarReloj` en `index.astro:187`):
  calcula `new Date('2026-12-19T19:00:00-03:00') - Date.now()`, formatea a
  enteros, actualiza cada segundo vía `setInterval`. Si la diferencia es
  negativa (show ya pasó), muestra mensaje "¡Hoy es el show!" en vez de
  números negativos.
- Sin dependencias nuevas.

### 4. Música de fondo

- `<audio id="audioFede" src="/sounds/fede/musica.mp3" loop preload="none">`
  agregado junto a los `<audio>` existentes en `index.astro:47-51`.
- Reusa el desbloqueo de audio ya existente (`habilitarAudio`,
  `index.astro:63`) — se agrega a la lista de audios ahí. Tras el primer
  click/touch del usuario (ya requerido por autoplay policies de los
  navegadores), si el tema activo es `fede`, se llama `aFede.play()`.
- Botón flotante 🔊/🔇 (esquina, similar posición a `.theme-selector` pero
  lado opuesto), visible solo en tema `fede` (mismo mecanismo CSS que el
  contador). Alterna `aFede.muted`, guarda preferencia en
  `localStorage.getItem('fedeMusicMuted')` para persistir entre recargas.
- Si el `<audio>` dispara `onerror` (archivo no existe todavía), el botón
  se deshabilita visualmente y no intenta reproducir.

## Cambio de tema en runtime

Falta verificar en el código actual *cómo* `cambiarTema` aplica la clase
`theme-<valor>` a `body` (probablemente un script en `BaseLayout.astro` o
similar, dado que `ThemeSelector.astro` solo define el `<select>`). El plan
de implementación debe leer ese mecanismo antes de tocar nada, y
simplemente agregar `fede` a la lista de temas válidos ahí — no se crea un
mecanismo nuevo.

## Testing / verificación

- Cambiar el selector a "Fede Vigevani" en el navegador y confirmar:
  fondo, colores, contador visible y corriendo, música se activa tras un
  click, botón de mute funciona y persiste tras recargar.
- Cambiar a otro tema y confirmar que contador/música/escena de Fede
  desaparecen y no interfieren.
- Probar con `poster.jpg`/`musica.mp3` ausentes: confirmar que no rompe la
  página (fallback de fondo, botón de música deshabilitado).
- Revisar en móvil/portrait (breakpoints ya existentes en el CSS) que el
  contador no rompe el layout de `.container`/`.card`.
