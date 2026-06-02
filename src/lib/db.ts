import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../datos_cajero.db');

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
      tareas_aprobadas TEXT
    );
    CREATE TABLE IF NOT EXISTS historial_diario (
      fecha TEXT PRIMARY KEY,
      tiempo_ganado INTEGER,
      tareas_completadas TEXT
    );
  `);
  migrateTiempoColumn();
}

function migrateTiempoColumn() {
  const cols = db.prepare("PRAGMA table_info(tareas_activas)").all() as { name: string }[];
  if (cols.some(c => c.name === 'tiempo')) return;

  db.exec("ALTER TABLE tareas_activas ADD COLUMN tiempo INTEGER NOT NULL DEFAULT 0");
  const count = (db.prepare("SELECT COUNT(*) as cnt FROM tareas_activas").get() as { cnt: number }).cnt;
  if (count > 0) {
    const defaultTiempo = Math.floor(120 / count);
    db.prepare("UPDATE tareas_activas SET tiempo = ?").run(defaultTiempo);
  }
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
    const numTasks = (data.activas || []).length;
    const defaultTiempo = numTasks > 0 ? Math.floor(120 / numTasks) : 15;
    for (const t of data.activas || []) {
      insertTask.run(t.nombre, t.icono || '📌', t.tiempo || defaultTiempo);
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
    "INSERT INTO estado_actual (id, fecha, tiempo_hoy, tareas_aprobadas) VALUES (1, ?, 0, '[]')"
  ).run(hoy);

  const defaults = [
    { nombre: 'Hacer la Cama', icono: '🛏️', tiempo: 17 },
    { nombre: 'Lavarse los dientes', icono: '🪥', tiempo: 17 },
    { nombre: 'Ordenar la Pieza', icono: '📦', tiempo: 17 },
    { nombre: 'Recoger la Ropa sucia', icono: '👕', tiempo: 17 },
    { nombre: 'Ayuda a regar las plantas', icono: '🌻', tiempo: 17 },
    { nombre: 'Darle comida y agua a los perros', icono: '🦴', tiempo: 17 },
    { nombre: 'Bañarse', icono: '🚿', tiempo: 17 },
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO tareas_activas (nombre, icono, tiempo) VALUES (?, ?, ?)');
  for (const t of defaults) {
    insert.run(t.nombre, t.icono, t.tiempo);
  }
}

export function loadState() {
  const d = getDb();
  const row = d.prepare('SELECT fecha, tiempo_hoy, tareas_aprobadas FROM estado_actual WHERE id = 1').get() as { fecha: string; tiempo_hoy: number; tareas_aprobadas: string } | undefined;
  const fecha = row?.fecha || new Date().toISOString().slice(0, 10);
  const tiempo_hoy = row?.tiempo_hoy || 0;
  const tareas_aprobadas: string[] = row ? JSON.parse(row.tareas_aprobadas) : [];
  const tareas_activas = d.prepare('SELECT nombre, icono, tiempo FROM tareas_activas').all() as { nombre: string; icono: string; tiempo: number }[];
  return { fecha, tiempo_hoy, tareas_aprobadas, tareas_activas };
}

export function saveState(
  fecha: string,
  tiempo_hoy: number,
  tareas_aprobadas: string[],
  tareas_activas: { nombre: string; icono: string; tiempo: number }[]
) {
  const d = getDb();
  d.prepare(
    'INSERT OR REPLACE INTO estado_actual (id, fecha, tiempo_hoy, tareas_aprobadas) VALUES (1, ?, ?, ?)'
  ).run(fecha, tiempo_hoy, JSON.stringify(tareas_aprobadas));

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
