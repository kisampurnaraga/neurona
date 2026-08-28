import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.ts';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'outputs', 'sqlite.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

function initTables(sqliteInstance: InstanceType<typeof Database>) {
  sqliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      phone_wa TEXT,
      password_plain TEXT,
      role TEXT DEFAULT 'user',
      credits INTEGER DEFAULT 0,
      status_aktif INTEGER DEFAULT 0,
      package_tier TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT,
      video_type TEXT,
      final_video_url TEXT,
      data TEXT,
      created_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(uid)
    );
  `);
}

function removeCorruptedDbFiles() {
  const filesToDelete = [
    dbPath,
    `${dbPath}-wal`,
    `${dbPath}-shm`,
    `${dbPath}-journal`
  ];
  for (const f of filesToDelete) {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
        console.warn(`[SQLite Cleanup] Deleted corrupted DB file: ${f}`);
      } catch (err) {
        console.error(`[SQLite Cleanup Error] Could not delete ${f}:`, err);
      }
    }
  }
}

function createDatabaseConnection(): InstanceType<typeof Database> {
  let sqliteInstance: InstanceType<typeof Database> | null = null;
  try {
    sqliteInstance = new Database(dbPath);
    sqliteInstance.pragma('journal_mode = WAL');
    // Test database integrity
    const check = sqliteInstance.pragma('quick_check') as Array<{ quick_check: string }>;
    if (check && check.length > 0 && check[0].quick_check !== 'ok') {
      throw new Error(`SQLite quick_check failed: ${JSON.stringify(check)}`);
    }
    initTables(sqliteInstance);
    return sqliteInstance;
  } catch (err: any) {
    console.error('[SQLite Init Error] Database file is corrupted or unreadable:', err?.message || err);
    if (sqliteInstance) {
      try {
        sqliteInstance.close();
      } catch {}
    }
    console.warn('[SQLite Recovery] Removing corrupted database files and creating a fresh SQLite database...');
    removeCorruptedDbFiles();

    // Re-create fresh database
    const freshInstance = new Database(dbPath);
    freshInstance.pragma('journal_mode = WAL');
    initTables(freshInstance);
    return freshInstance;
  }
}

const sqlite = createDatabaseConnection();
export const db = drizzle(sqlite, { schema });

