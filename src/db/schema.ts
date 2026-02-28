import * as SQLite from 'expo-sqlite';

export const initDatabase = async (db: SQLite.SQLiteDatabase) => {
  // Enforce foreign key constraints
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables in order of dependency
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Task (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      time_of_day TEXT NOT NULL,
      is_soft INTEGER NOT NULL DEFAULT 1,
      pre_task_lead_minutes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS TaskConstraint (
      task_id TEXT PRIMARY KEY,
      min_gap_hours INTEGER,
      depends_on_task_id TEXT,
      atomic_pair_id TEXT,
      day_type_eligibility TEXT, -- JSON array string
      FOREIGN KEY (task_id) REFERENCES Task(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_task_id) REFERENCES Task(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS SentinelRoutine (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- standard/gym/rest
      task_ids TEXT NOT NULL, -- JSON array string
      effective_from_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS TempSentinelProjection (
      week_start TEXT PRIMARY KEY,
      original_sentinel_id TEXT NOT NULL,
      new_sentinel_id TEXT NOT NULL,
      remaining_days TEXT NOT NULL, -- JSON array string
      expires_at TEXT NOT NULL,
      FOREIGN KEY (original_sentinel_id) REFERENCES SentinelRoutine(id),
      FOREIGN KEY (new_sentinel_id) REFERENCES SentinelRoutine(id)
    );

    CREATE TABLE IF NOT EXISTS DailySchedule (
      date TEXT PRIMARY KEY,
      day_type TEXT NOT NULL,
      task_instance_ids TEXT NOT NULL, -- JSON array string
      source TEXT NOT NULL -- sentinel/temp
    );

    CREATE TABLE IF NOT EXISTS TaskInstance (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL, -- PENDING/COMPLETED/SKIPPED/BLOCKED/MISSED
      completed_at TEXT,
      skip_reason TEXT,
      is_redistributed INTEGER NOT NULL DEFAULT 0,
      source_date TEXT,
      FOREIGN KEY (task_id) REFERENCES Task(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS InventoryItem (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      linked_task_id TEXT,
      in_stock INTEGER NOT NULL DEFAULT 1,
      restocked_at TEXT,
      alert_sent INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (linked_task_id) REFERENCES Task(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS MealEntry (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      calories REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      inferred_at TEXT
    );

    CREATE TABLE IF NOT EXISTS AdaptiveSuggestion (
      id TEXT PRIMARY KEY,
      generated_at TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      description TEXT NOT NULL,
      affected_task_id TEXT,
      is_dismissed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (affected_task_id) REFERENCES Task(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS UserProfile (
      id TEXT PRIMARY KEY,
      goals TEXT, -- JSON array string
      week_reset_hour INTEGER NOT NULL DEFAULT 3,
      restock_cutoff_hour INTEGER NOT NULL DEFAULT 14,
      onboarding_complete INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS SyncQueue (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON string
      created_at TEXT NOT NULL,
      processed_at TEXT,
      status TEXT NOT NULL -- PENDING/PROCESSED/FAILED
    );
  `);
};
