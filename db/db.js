const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

let useSQLite = false;
let sqliteDb = null;
let pgPool = null;

// Unique ID Generator fallback for SQLite
function generateId(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
}

// Initialise SQLite Connection and Schema
function initSQLite() {
  if (useSQLite) return; // Prevent double initialization
  
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'homeopathy.db');
    const dbExists = fs.existsSync(dbPath);
    
    console.log(`\n⚠️  Supabase/PostgreSQL is offline or host name is invalid.`);
    console.log(`🔌 Falling back to local SQLite database at: ${dbPath}\n`);
    
    sqliteDb = new sqlite3.Database(dbPath);
    useSQLite = true;
    
    if (!dbExists) {
      console.log('🔄 Creating and seeding local SQLite tables...');
      
      // Basic schema setup for SQLite
      sqliteDb.serialize(() => {
        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS patients (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            age           INTEGER,
            gender        TEXT,
            phone         TEXT,
            email         TEXT,
            blood_group   TEXT,
            address       TEXT,
            chief_complaint TEXT,
            history       TEXT,
            notes         TEXT,
            vitals        TEXT DEFAULT '{}',
            created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
            last_visit    TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS timeline (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id  TEXT REFERENCES patients(id) ON DELETE CASCADE,
            visit_date  TEXT DEFAULT CURRENT_DATE,
            note        TEXT,
            remedy      TEXT,
            potency     TEXT,
            dosage      TEXT,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS appointments (
            id            TEXT PRIMARY KEY,
            patient_name  TEXT NOT NULL,
            phone         TEXT,
            email         TEXT,
            appt_date     TEXT NOT NULL,
            appt_time     TEXT NOT NULL,
            reason        TEXT,
            status        TEXT DEFAULT 'pending',
            reject_reason TEXT,
            patient_id    TEXT REFERENCES patients(id) ON DELETE SET NULL,
            created_at    TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS prescriptions (
            id            TEXT PRIMARY KEY,
            patient_id    TEXT REFERENCES patients(id) ON DELETE CASCADE,
            patient_name  TEXT,
            medicines     TEXT DEFAULT '[]',
            instructions  TEXT,
            follow_up     TEXT,
            issued_at     TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS medicine_kits (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT,
            slots       TEXT DEFAULT '[]',
            template    TEXT,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Insert Seed Data
        sqliteDb.run(`
          INSERT OR IGNORE INTO patients (id, name, age, gender, phone, email, blood_group, address, chief_complaint, history, notes)
          VALUES
            ('PAT-DEMO001','Priya Sharma',32,'Female','9876543210','priya@email.com','O+','12, Rose Lane, Ahmedabad','Chronic Migraine','Recurring migraines for 5 years, worse in summers','Responds well to Belladonna 30'),
            ('PAT-DEMO002','Rajesh Patel',45,'Male','9765432109','rajesh@email.com','A+','34, Shanti Nagar, Surat','Rheumatoid Arthritis','Joint pain and stiffness, aggravated in cold weather','Rhus Tox works well'),
            ('PAT-DEMO003','Anita Desai',28,'Female','9654321098','anita@email.com','B+','7, Gandhi Road, Vadodara','Anxiety & Insomnia','Severe anxiety attacks, work stress','Aconite and Ignatia alternating')
        `);

        sqliteDb.run(`
          INSERT OR IGNORE INTO timeline (patient_id, visit_date, note, remedy, potency)
          VALUES
            ('PAT-DEMO001','2025-01-15','Initial consultation. Started Belladonna 30.','Belladonna','30C'),
            ('PAT-DEMO001','2025-02-10','Significant improvement. Reduced frequency.','Nat Mur','200C'),
            ('PAT-DEMO001','2025-04-20','Follow-up. Continuing treatment.','Belladonna','30C'),
            ('PAT-DEMO002','2025-02-01','First visit. Severe stiffness.','Rhus Tox','30C'),
            ('PAT-DEMO002','2025-03-15','Marked improvement.','Rhus Tox','200C'),
            ('PAT-DEMO003','2025-03-10','Initial visit. Panic attacks.','Aconite','200C'),
            ('PAT-DEMO003','2025-04-25','Much calmer. Sleeping better.','Ignatia','30C')
        `);

        console.log('✅ Local SQLite Database initialized successfully!');
      });
    }
  } catch (err) {
    console.error('❌ Failed to fallback to SQLite:', err);
  }
}

// Initialise PostgreSQL Pool
function initPostgres() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'undefined' || process.env.DATABASE_URL === 'null') {
    initSQLite();
    return;
  }

  try {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 3000,
    });

    // Probe Postgres connection asynchronously
    pgPool.query('SELECT 1', (err) => {
      if (err) {
        initSQLite();
      }
    });

    pgPool.on('error', (err) => {
      if (!useSQLite) initSQLite();
    });
  } catch (e) {
    console.error('⚠️  Failed to create Postgres pool:', e.message);
    initSQLite();
  }
}

// Boot database connections
initPostgres();

// Unified Database Query API
async function query(text, params = []) {
  if (useSQLite || !pgPool) {
    if (!sqliteDb) initSQLite();
    return new Promise((resolve, reject) => {
      // 1. Translate parameter placeholders ($1, $2, $3 -> ?, ?, ?)
      let sql = text.replace(/\$(\d+)/g, '?');
      
      // 2. Translate Dialect Functions
      sql = sql.replace(/\bILIKE\b/gi, 'LIKE');
      sql = sql.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
      
      // 3. Inject random IDs if missing on inserts
      let insertId = null;
      if (sql.trim().toUpperCase().startsWith('INSERT INTO')) {
        const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1].toLowerCase();
          const columnsMatch = sql.match(/\(([^)]+)\)/);
          if (columnsMatch) {
            const cols = columnsMatch[1].split(',').map(c => c.trim().toLowerCase());
            if (!cols.includes('id')) {
              let prefix = '';
              if (tableName === 'patients') prefix = 'PAT';
              else if (tableName === 'appointments') prefix = 'APPT';
              else if (tableName === 'prescriptions') prefix = 'RX';
              else if (tableName === 'medicine_kits') prefix = 'KIT';
              
              if (prefix) {
                insertId = generateId(prefix);
                // Modify SQL to insert ID
                sql = sql.replace(/\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i, (m, colGroup, valGroup) => {
                  return `(id, ${colGroup}) VALUES (?, ${valGroup})`;
                });
                params.unshift(insertId);
              }
            }
          }
        }
      }

      // 4. Strip "RETURNING *" since SQLite handles this differently
      const hasReturning = sql.toUpperCase().includes('RETURNING');
      sql = sql.replace(/\s*RETURNING\s+\*?\s*$/i, '');

      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

      if (isSelect) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows });
        });
      } else {
        sqliteDb.run(sql, params, function(err) {
          if (err) return reject(err);
          
          // Emulate PG rows returned for RETURNING * inserts
          if (hasReturning) {
            const lastId = insertId || this.lastID || params[params.length - 1];
            const tableMatch = sql.match(/(?:INSERT INTO|UPDATE)\s+(\w+)/i);
            const tableName = tableMatch ? tableMatch[1] : '';
            
            sqliteDb.all(`SELECT * FROM ${tableName} WHERE id = ? OR rowid = ?`, [lastId, this.lastID], (err, rows) => {
              if (err || !rows.length) {
                resolve({ rows: [{ id: lastId }] });
              } else {
                const result = { ...rows[0] };
                if (result.vitals && typeof result.vitals === 'string') {
                  try { result.vitals = JSON.parse(result.vitals); } catch(e){}
                }
                if (result.medicines && typeof result.medicines === 'string') {
                  try { result.medicines = JSON.parse(result.medicines); } catch(e){}
                }
                if (result.slots && typeof result.slots === 'string') {
                  try { result.slots = JSON.parse(result.slots); } catch(e){}
                }
                resolve({ rows: [result] });
              }
            });
          } else {
            resolve({ rows: [] });
          }
        });
      }
    });
  }

  // Postgres Pool execution with transparent SQLite fallback
  try {
    return await pgPool.query(text, params);
  } catch (err) {
    const isConnErr = err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.message.includes('connect');
    if (isConnErr) {
      initSQLite();
      return query(text, params); // Transparent retry
    }
    throw err;
  }
}

module.exports = {
  query,
  getClient: async () => {
    if (useSQLite || !pgPool) {
      if (!sqliteDb) initSQLite();
      return {
        query: (text, params) => query(text, params),
        release: () => {},
      };
    }
    try {
      return await pgPool.connect();
    } catch (err) {
      const isConnErr = err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.message.includes('connect');
      if (isConnErr) {
        initSQLite();
        return {
          query: (text, params) => query(text, params),
          release: () => {},
        };
      }
      throw err;
    }
  },
  useSQLite: () => useSQLite,
};
