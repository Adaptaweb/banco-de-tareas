import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'datos_cajero.db');
const SLIDESHOW_DIR = path.resolve(process.cwd(), 'public/slideshow');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  initTables();
  migrateLegacyJson();
  seedDefaults();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tareas_activas (
      nombre TEXT PRIMARY KEY,
      icono TEXT,
      tiempo INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS estado_actual (
      id INTEGER PRIMARY KEY,
      fecha TEXT,
      tiempo_hoy INTEGER,
      tareas_aprobadas TEXT,
      estado_mision TEXT DEFAULT 'esperando'
    );
    CREATE TABLE IF NOT EXISTS historial_diario (
      fecha TEXT PRIMARY KEY,
      tiempo_ganado INTEGER,
      tareas_completadas TEXT
    );
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  migrateEstadoMisionColumn();
  initSlideshowTable();
  seedHaConfig();
}

function migrateEstadoMisionColumn() {
  const cols = db.prepare("PRAGMA table_info(estado_actual)").all() as { name: string }[];
  if (cols.some(c => c.name === 'estado_mision')) return;
  db.exec("ALTER TABLE estado_actual ADD COLUMN estado_mision TEXT DEFAULT 'esperando'");
}

function migrateLegacyJson() {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM estado_actual').get() as { cnt: number };
  if (row.cnt > 0) return;

  const jsonPath = path.resolve(__dirname, '../../datos_cajero.json');
  if (!fs.existsSync(jsonPath)) return;

  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const fecha = data.fecha || new Date().toISOString().slice(0, 10);
    const tiempo = data.tiempo || 0;
    const aprobadas = JSON.stringify(data.aprobadas || []);

    db.prepare(
      'INSERT INTO estado_actual (id, fecha, tiempo_hoy, tareas_aprobadas) VALUES (1, ?, ?, ?)'
    ).run(fecha, tiempo, aprobadas);

    const insertTask = db.prepare('INSERT OR IGNORE INTO tareas_activas (nombre, icono, tiempo) VALUES (?, ?, ?)');
    for (const t of data.activas || []) {
      insertTask.run(t.nombre, t.icono || '📌', t.tiempo || 15);
    }
  } catch (e) {
    console.error('Error migrating JSON:', e);
  }
}

function seedDefaults() {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM estado_actual').get() as { cnt: number };
  if (row.cnt > 0) return;

  const hoy = new Date().toISOString().slice(0, 10);
  db.prepare(
    "INSERT INTO estado_actual (id, fecha, tiempo_hoy, tareas_aprobadas, estado_mision) VALUES (1, ?, 0, '[]', 'esperando')"
  ).run(hoy);

  const defaults = [
    { nombre: 'Hacer la Cama', icono: '🛏️', tiempo: 15 },
    { nombre: 'Lavarse los dientes', icono: '🪥', tiempo: 15 },
    { nombre: 'Ordenar la Pieza', icono: '📦', tiempo: 15 },
    { nombre: 'Recoger la Ropa sucia', icono: '👕', tiempo: 15 },
    { nombre: 'Ayuda a regar las plantas', icono: '🌻', tiempo: 15 },
    { nombre: 'Darle comida y agua a los perros', icono: '🦴', tiempo: 15 },
    { nombre: 'Bañarse', icono: '🚿', tiempo: 15 },
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO tareas_activas (nombre, icono, tiempo) VALUES (?, ?, ?)');
  for (const t of defaults) {
    insert.run(t.nombre, t.icono, t.tiempo);
  }
}

export function loadState() {
  const d = getDb();
  const row = d.prepare('SELECT fecha, tiempo_hoy, tareas_aprobadas, estado_mision FROM estado_actual WHERE id = 1').get() as { fecha: string; tiempo_hoy: number; tareas_aprobadas: string; estado_mision: string } | undefined;
  const fecha = row?.fecha || new Date().toISOString().slice(0, 10);
  const tiempo_hoy = row?.tiempo_hoy || 0;
  const tareas_aprobadas: string[] = row ? JSON.parse(row.tareas_aprobadas) : [];
  const estado_mision = row?.estado_mision || 'esperando';
  const tareas_activas = d.prepare('SELECT nombre, icono, tiempo FROM tareas_activas').all() as { nombre: string; icono: string; tiempo: number }[];
  return { fecha, tiempo_hoy, tareas_aprobadas, tareas_activas, estado_mision };
}

export function saveState(
  fecha: string,
  tiempo_hoy: number,
  tareas_aprobadas: string[],
  tareas_activas: { nombre: string; icono: string; tiempo: number }[],
  estado_mision: string = 'esperando'
) {
  const d = getDb();
  d.prepare(
    'INSERT OR REPLACE INTO estado_actual (id, fecha, tiempo_hoy, tareas_aprobadas, estado_mision) VALUES (1, ?, ?, ?, ?)'
  ).run(fecha, tiempo_hoy, JSON.stringify(tareas_aprobadas), estado_mision);

  d.prepare('DELETE FROM tareas_activas').run();
  const insert = d.prepare('INSERT INTO tareas_activas (nombre, icono, tiempo) VALUES (?, ?, ?)');
  for (const t of tareas_activas) {
    insert.run(t.nombre, t.icono, t.tiempo);
  }
}

export function addTask(nombre: string, icono: string, tiempo: number = 15) {
  getDb().prepare('INSERT OR IGNORE INTO tareas_activas (nombre, icono, tiempo) VALUES (?, ?, ?)').run(nombre, icono, tiempo);
}

export function updateTask(nombre: string, nuevoNombre: string, icono: string, tiempo: number) {
  getDb().prepare('UPDATE tareas_activas SET nombre = ?, icono = ?, tiempo = ? WHERE nombre = ?').run(nuevoNombre, icono, tiempo, nombre);
}

export function removeTask(nombre: string) {
  getDb().prepare('DELETE FROM tareas_activas WHERE nombre = ?').run(nombre);
}

function seedHaConfig() {
  const d = getDb();
  const existing = d.prepare('SELECT value FROM config WHERE key = ?').get('ha_ip_list') as { value: string } | undefined;
  if (existing) return;

  const envIp = process.env.HA_IP || '192.168.3.99';
  const list = JSON.stringify([envIp]);
  d.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)').run('ha_ip_list', list);
  d.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)').run('ha_ip_active', envIp);
}

export function getConfig(key: string, defaultVal?: string): string | null {
  const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : defaultVal ?? null;
}

export function setConfig(key: string, value: string) {
  getDb().prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
}

export function saveDailyHistory(fecha: string, tiempo_hoy: number, tareas_aprobadas: string[]) {
  getDb().prepare(
    'INSERT OR REPLACE INTO historial_diario (fecha, tiempo_ganado, tareas_completadas) VALUES (?, ?, ?)'
  ).run(fecha, tiempo_hoy, JSON.stringify(tareas_aprobadas));
}

export function deleteDailyHistory(fecha: string) {
  getDb().prepare('DELETE FROM historial_diario WHERE fecha = ?').run(fecha);
}

export function getHistory() {
  const rows = getDb().prepare('SELECT fecha, tiempo_ganado, tareas_completadas FROM historial_diario ORDER BY fecha DESC').all() as { fecha: string; tiempo_ganado: number; tareas_completadas: string }[];
  return rows.map(r => ({
    fecha: r.fecha,
    tiempo_ganado: r.tiempo_ganado,
    tareas_completadas: JSON.parse(r.tareas_completadas) as string[],
  }));
}

/* ===== Slideshow image management ===== */

export interface SlideshowImage {
  id: number;
  filename: string;
  active: number;
  sort_order: number;
  created_at: string;
}

function initSlideshowTable() {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS slideshow_images (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      filename   TEXT NOT NULL UNIQUE,
      active     INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  syncSlideshowFromFilesystem();
}

export function syncSlideshowFromFilesystem() {
  const d = getDb();
  if (!fs.existsSync(SLIDESHOW_DIR)) {
    fs.mkdirSync(SLIDESHOW_DIR, { recursive: true });
    return;
  }
  const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const existing = fs.readdirSync(SLIDESHOW_DIR).filter(f =>
    validExts.some(ext => f.toLowerCase().endsWith(ext))
  );
  const insert = d.prepare('INSERT OR IGNORE INTO slideshow_images (filename) VALUES (?)');
  for (const f of existing) {
    insert.run(f);
  }
}

export function loadSlideshowImages(activeOnly = false): SlideshowImage[] {
  const d = getDb();
  const sql = activeOnly
    ? 'SELECT * FROM slideshow_images WHERE active = 1 ORDER BY sort_order, created_at'
    : 'SELECT * FROM slideshow_images ORDER BY sort_order, created_at';
  return d.prepare(sql).all() as SlideshowImage[];
}

export function addSlideshowImage(filename: string) {
  getDb().prepare('INSERT OR IGNORE INTO slideshow_images (filename) VALUES (?)').run(filename);
}

export function removeSlideshowImage(id: number) {
  getDb().prepare('DELETE FROM slideshow_images WHERE id = ?').run(id);
}

export function toggleSlideshowImage(id: number) {
  getDb().prepare('UPDATE slideshow_images SET active = CASE WHEN active THEN 0 ELSE 1 END WHERE id = ?').run(id);
}
