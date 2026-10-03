/**
 * KAVACH CAMPUS — Database Module (better-sqlite3)
 * Native SQLite driver for durability and concurrency.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'kavach.db');
let _db = null;

async function getDatabase() {
  if (_db) return _db;

  _db = new Database(DB_PATH, {
    // verbose: console.log
  });

  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);
  return _db;
}

// saveDatabase is no longer needed because writes are synchronous and durable.
// We keep an empty function to maintain API compatibility for now.
function saveDatabase() {
  // No-op for better-sqlite3
}

function initSchema(db) {
  // All the CREATE TABLEs go here
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      student_id TEXT,
      department TEXT,
      year INTEGER,
      section TEXT,
      is_verified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      reporter_id TEXT NOT NULL,
      title TEXT,
      description TEXT NOT NULL,
      category TEXT,
      ai_category TEXT,
      severity TEXT DEFAULT 'L1',
      ai_severity TEXT,
      urgency TEXT DEFAULT 'NORMAL',
      ai_urgency TEXT,
      ai_confidence REAL,
      ai_explanation TEXT,
      ai_model TEXT,
      ai_analyzed_at TEXT,
      human_override INTEGER DEFAULT 0,
      final_severity TEXT,
      status TEXT DEFAULT 'OPEN',
      is_emergency INTEGER DEFAULT 0,
      is_sos INTEGER DEFAULT 0,
      is_anonymous INTEGER DEFAULT 0,
      latitude REAL,
      longitude REAL,
      accuracy REAL,
      location_name TEXT,
      campus_zone TEXT,
      department TEXT,
      assigned_to TEXT,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      resolved_by TEXT,
      resolved_at TEXT,
      resolution_notes TEXT,
      escalation_level INTEGER DEFAULT 0,
      last_escalated_at TEXT,
      original_language TEXT DEFAULT 'en',
      original_text TEXT,
      translated_text TEXT,
      voice_recording_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec('ALTER TABLE cases ADD COLUMN is_anonymous INTEGER DEFAULT 0');
  } catch (e) {}

  try {
    db.exec('ALTER TABLE cases ADD COLUMN requires_human_review INTEGER DEFAULT 0');
  } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS case_timeline (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      performed_by TEXT,
      performer_role TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS case_routing (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      routed_to TEXT NOT NULL,
      role TEXT NOT NULL,
      reason TEXT,
      notified INTEGER DEFAULT 0,
      notified_at TEXT,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS escalation_rules (
      id TEXT PRIMARY KEY,
      severity TEXT NOT NULL,
      escalation_level INTEGER NOT NULL,
      timeout_minutes INTEGER NOT NULL,
      target_role TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      case_id TEXT,
      is_read INTEGER DEFAULT 0,
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trusted_contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      phone TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS safe_walks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      start_lat REAL,
      start_lng REAL,
      end_lat REAL,
      end_lng REAL,
      destination TEXT,
      expected_minutes INTEGER NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      alerted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  seedDefaults(db);
}

function seedDefaults(db) {
  const { v4: uuid } = require('uuid');

  const ruleCount = db.prepare("SELECT COUNT(*) as c FROM escalation_rules").get();
  if (ruleCount.c === 0) {
    const rules = [
      ['L1', 1, 60, 'MENTOR'], ['L1', 2, 120, 'HOD'],
      ['L2', 1, 30, 'HOD'], ['L2', 2, 60, 'COUNSELOR'], ['L2', 3, 120, 'PRINCIPAL'],
      ['L3', 1, 15, 'SECURITY'], ['L3', 2, 30, 'HOD'], ['L3', 3, 60, 'PRINCIPAL'],
      ['L4', 1, 5, 'SECURITY'], ['L4', 2, 10, 'PRINCIPAL'], ['L4', 3, 15, 'SUPER_ADMIN'],
    ];
    const insert = db.prepare('INSERT INTO escalation_rules (id, severity, escalation_level, timeout_minutes, target_role, is_active, created_at) VALUES (?,?,?,?,?,1,datetime("now"))');
    const insertMany = db.transaction((rulesToInsert) => {
      for (const rule of rulesToInsert) {
        insert.run(uuid(), ...rule);
      }
    });
    insertMany(rules);
  }

  const configCount = db.prepare("SELECT COUNT(*) as c FROM ai_config").get();
  if (configCount.c === 0) {
    const configs = [
      ['ai_enabled', 'true'], ['category_classification', 'true'],
      ['severity_detection', 'true'], ['urgency_detection', 'true'],
      ['summarization', 'true'], ['suggested_routing', 'true'],
      ['confidence_threshold', '0.7'], ['human_review_threshold', '0.5'],
      ['ai_provider', 'gemini'], ['ai_model', 'gemini-2.0-flash'],
    ];
    const insert = db.prepare('INSERT OR IGNORE INTO ai_config (key, value, updated_at) VALUES (?,?,datetime("now"))');
    const insertMany = db.transaction((configsToInsert) => {
      for (const config of configsToInsert) {
        insert.run(...config);
      }
    });
    insertMany(configs);
  }

  const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'SUPER_ADMIN'").get();
  if (adminCount.c === 0) {
    global.FIRST_RUN_SETUP_REQUIRED = true;
  } else {
    global.FIRST_RUN_SETUP_REQUIRED = false;
  }
}

// Wrapper for existing queryAll
function queryAll(db, sql, params = []) {
  return db.prepare(sql).all(...params);
}

// Wrapper for existing queryOne
function queryOne(db, sql, params = []) {
  return db.prepare(sql).get(...params);
}

// Wrapper for existing runQuery
function runQuery(db, sql, params = []) {
  const result = db.prepare(sql).run(...params);
  return { changes: result.changes };
}

// Create transaction wrapper if needed
function transaction(db, callback) {
  const execute = db.transaction(callback);
  return execute();
}

module.exports = { getDatabase, saveDatabase, queryAll, queryOne, runQuery, transaction };
