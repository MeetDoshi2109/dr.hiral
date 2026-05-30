const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Unique ID Generator
function generateId(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
}

// ── Pluggable Database Routing Configuration ────────────────
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const usePostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

const useFirebase = !usePostgres && !!(
  process.env.FIREBASE_PROJECT_ID && 
  process.env.FIREBASE_PROJECT_ID !== 'undefined' && 
  process.env.FIREBASE_PROJECT_ID !== 'null'
);

let pgPool = null;
let firestore = null;
let sqliteDb = null;

// ── 1. PostgreSQL (Supabase) Setup ─────────────────────────
if (usePostgres) {
  try {
    const { Pool } = require('pg');
    console.log('🐘 Connecting to PostgreSQL (Supabase) database...');
    
    // Bypass self-signed cert issues with SSL pooler connection
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    pgPool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Run schema initialization DDL automatically on boot
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      pgPool.query(schemaSql)
        .then(() => {
          console.log('✅ PostgreSQL (Supabase) schema and seed verified successfully!');
        })
        .catch(err => {
          console.error('⚠️ Warning during PostgreSQL schema initialization:', err.message);
        });
    }
  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL connection:', err.message);
  }
}

// ── 2. Firebase Configuration & Initialization ─────────────
if (useFirebase) {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }
    firestore = admin.firestore();
    console.log('🔥 Connected to Google Firebase Firestore successfully!');
    
    // Auto-seed Firestore if patients collection is empty
    firestore.collection('patients').limit(1).get().then(snap => {
      if (snap.empty) {
        console.log('🔄 Firestore is blank. Seeding 5 Indian demo patients...');
        const batch = firestore.batch();
        
        const patients = [
          { id: 'PAT-DEMO001', name: 'Priya Sharma', age: 32, gender: 'Female', phone: '9876543210', email: 'priya@email.com', blood_group: 'O+', address: '12, Rose Lane, Ahmedabad', chief_complaint: 'Chronic Migraine', history: 'Recurring migraines for 5 years, worse in summers', notes: 'Responds well to Belladonna 30', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() },
          { id: 'PAT-DEMO002', name: 'Rajesh Patel', age: 45, gender: 'Male', phone: '9765432109', email: 'rajesh@email.com', blood_group: 'A+', address: '34, Shanti Nagar, Surat', chief_complaint: 'Rheumatoid Arthritis', history: 'Joint pain and stiffness, aggravated in cold weather', notes: 'Rhus Tox works well', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() },
          { id: 'PAT-DEMO003', name: 'Anita Desai', age: 28, gender: 'Female', phone: '9654321098', email: 'anita@email.com', blood_group: 'B+', address: '7, Gandhi Road, Vadodara', chief_complaint: 'Anxiety & Insomnia', history: 'Severe anxiety attacks, work stress', notes: 'Aconite and Ignatia alternating', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() },
          { id: 'PAT-DEMO004', name: 'Vikram Malhotra', age: 38, gender: 'Male', phone: '9543210987', email: 'vikram@email.com', blood_group: 'AB+', address: '45, Sea Breeze Heights, Bandra, Mumbai', chief_complaint: 'Acid Reflux & GERD', history: 'Chronic acidity, heartburn, bloating after meals', notes: 'Prescribed Nux Vomica and Robinia', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() },
          { id: 'PAT-DEMO005', name: 'Sunita Rao', age: 52, gender: 'Female', phone: '9432109876', email: 'sunita@email.com', blood_group: 'O-', address: '89, Orchid Green Society, Baner, Pune', chief_complaint: 'Chronic Eczema', history: 'Dry, itchy skin eruptions on hands and elbows for 3 years', notes: 'Responds excellently to Sulphur and Graphites', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() }
        ];
        
        patients.forEach(p => {
          const ref = firestore.collection('patients').doc(p.id);
          batch.set(ref, p);
        });
        
        const timeline = [
          { id: 't1', patient_id: 'PAT-DEMO001', visit_date: '2025-01-15', note: 'Initial consultation. Started Belladonna 30.', remedy: 'Belladonna', potency: '30C', created_at: new Date().toISOString() },
          { id: 't2', patient_id: 'PAT-DEMO001', visit_date: '2025-02-10', note: 'Significant improvement. Reduced frequency.', remedy: 'Nat Mur', potency: '200C', created_at: new Date().toISOString() },
          { id: 't3', patient_id: 'PAT-DEMO001', visit_date: '2025-04-20', note: 'Follow-up. Continuing treatment.', remedy: 'Belladonna', potency: '30C', created_at: new Date().toISOString() },
          { id: 't4', patient_id: 'PAT-DEMO002', visit_date: '2025-02-01', note: 'First visit. Severe stiffness.', remedy: 'Rhus Tox', potency: '30C', created_at: new Date().toISOString() },
          { id: 't5', patient_id: 'PAT-DEMO002', visit_date: '2025-03-15', note: 'Marked improvement.', remedy: 'Rhus Tox', potency: '200C', created_at: new Date().toISOString() },
          { id: 't6', patient_id: 'PAT-DEMO003', visit_date: '2025-03-10', note: 'Initial visit. Panic attacks.', remedy: 'Aconite', potency: '200C', created_at: new Date().toISOString() },
          { id: 't7', patient_id: 'PAT-DEMO003', visit_date: '2025-04-25', note: 'Much calmer. Sleeping better.', remedy: 'Ignatia', potency: '30C', created_at: new Date().toISOString() },
          { id: 't8', patient_id: 'PAT-DEMO004', visit_date: '2025-03-01', note: 'First consult. Heartburn and bloating. Started Nux Vomica.', remedy: 'Nux Vomica', potency: '30C', created_at: new Date().toISOString() },
          { id: 't9', patient_id: 'PAT-DEMO004', visit_date: '2025-03-20', note: 'Bloating gone, minor acidity remains. Switched to Robinia.', remedy: 'Robinia', potency: '30C', created_at: new Date().toISOString() },
          { id: 't10', patient_id: 'PAT-DEMO005', visit_date: '2025-02-15', note: 'Severe itching and eruptions. Prescribed Sulphur.', remedy: 'Sulphur', potency: '200C', created_at: new Date().toISOString() },
          { id: 't11', patient_id: 'PAT-DEMO005', visit_date: '2025-04-10', note: 'Eruptions clearing, skin smoothing. Prescribed Graphites.', remedy: 'Graphites', potency: '30C', created_at: new Date().toISOString() }
        ];
        
        timeline.forEach(t => {
          const ref = firestore.collection('timeline').doc(t.id);
          batch.set(ref, t);
        });
        
        batch.commit().then(() => {
          console.log('✅ Firestore database seeded successfully!');
        });
      }
    });
  } catch (err) {
    console.error('❌ Failed to fallback to Firebase Firestore:', err.message);
  }
}

// ── 3. SQLite Configuration & Initialization (Local Fallback) ──
const dbPath = path.join(__dirname, 'homeopathy.db');

function initSQLite() {
  if (sqliteDb || useFirebase || usePostgres) return;
  
  try {
    const sqlite3 = require('sqlite3').verbose();
    console.log(`🔌 Initialising local SQLite database at: ${dbPath}`);
    sqliteDb = new sqlite3.Database(dbPath);
    
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

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS bug_reports (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          description TEXT NOT NULL,
          status      TEXT DEFAULT 'pending',
          reported_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS patient_documents (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id  TEXT NOT NULL,
          doc_name    TEXT NOT NULL,
          file_path   TEXT NOT NULL,
          uploaded_by TEXT NOT NULL,
          notes       TEXT,
          uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb.get("SELECT COUNT(*) as count FROM patients", (err, row) => {
        if (err) return;
        if (row && row.count === 0) {
          console.log('🔄 Seeding local SQLite tables with 5 Indian patients...');
          sqliteDb.serialize(() => {
            sqliteDb.run(`
              INSERT INTO patients (id, name, age, gender, phone, email, blood_group, address, chief_complaint, history, notes)
              VALUES
                ('PAT-DEMO001','Priya Sharma',32,'Female','9876543210','priya@email.com','O+','12, Rose Lane, Ahmedabad','Chronic Migraine','Recurring migraines for 5 years, worse in summers','Responds well to Belladonna 30'),
                ('PAT-DEMO002','Rajesh Patel',45,'Male','9765432109','rajesh@email.com','A+','34, Shanti Nagar, Surat','Rheumatoid Arthritis','Joint pain and stiffness, aggravated in cold weather','Rhus Tox works well'),
                ('PAT-DEMO003','Anita Desai',28,'Female','9654321098','anita@email.com','B+','7, Gandhi Road, Vadodara','Anxiety & Insomnia','Severe anxiety attacks, work stress','Aconite and Ignatia alternating'),
                ('PAT-DEMO004','Vikram Malhotra',38,'Male','9543210987','vikram@email.com','AB+','45, Sea Breeze Heights, Bandra, Mumbai','Acid Reflux & GERD','Chronic acidity, heartburn, bloating after meals','Prescribed Nux Vomica and Robinia'),
                ('PAT-DEMO005','Sunita Rao',52,'Female','9432109876','sunita@email.com','O-','89, Orchid Green Society, Baner, Pune','Chronic Eczema','Dry, itchy skin eruptions on hands and elbows for 3 years','Responds excellently to Sulphur and Graphites')
            `);

            sqliteDb.run(`
              INSERT INTO timeline (patient_id, visit_date, note, remedy, potency)
              VALUES
                ('PAT-DEMO001','2025-01-15','Initial consultation. Started Belladonna 30.','Belladonna','30C'),
                ('PAT-DEMO001','2025-02-10','Significant improvement. Reduced frequency.','Nat Mur','200C'),
                ('PAT-DEMO001','2025-04-20','Follow-up. Continuing treatment.','Belladonna','30C'),
                ('PAT-DEMO002','2025-02-01','First visit. Severe stiffness.','Rhus Tox','30C'),
                ('PAT-DEMO002','2025-03-15','Marked improvement.','Rhus Tox','200C'),
                ('PAT-DEMO003','2025-03-10','Initial visit. Panic attacks.','Aconite','200C'),
                ('PAT-DEMO003','2025-04-25','Much calmer. Sleeping better.','Ignatia','30C'),
                ('PAT-DEMO004','2025-03-01','First consult. Heartburn and bloating. Started Nux Vomica.','Nux Vomica','30C'),
                ('PAT-DEMO004','2025-03-20','Bloating gone, minor acidity remains. Switched to Robinia.','Robinia','30C'),
                ('PAT-DEMO005','2025-02-15','Severe itching and eruptions. Prescribed Sulphur.','Sulphur','200C'),
                ('PAT-DEMO005','2025-04-10','Eruptions clearing, skin smoothing. Prescribed Graphites.','Graphites','30C')
            `);
            console.log('✅ Local SQLite Database initialized with 5 Indian patients successfully!');
          });
        }
      });
    });
  } catch (err) {
    console.error('❌ Failed to initialize SQLite:', err.message);
  }
}

if (!useFirebase && !usePostgres) {
  initSQLite();
}

// ── Virtual query engine for Google Firestore ───────────────
async function queryFirestore(text, params = []) {
  const sql = text.trim();
  const upper = sql.toUpperCase();
  
  // 1. SELECT * FROM collection
  if (upper.startsWith('SELECT')) {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) return { rows: [] };
    const tableName = tableMatch[1].toLowerCase();
    const isCount = upper.includes('COUNT(*)');
    
    const snap = await firestore.collection(tableName).get();
    let rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // A. FILTER: WHERE id = ?
    const idMatch = sql.match(/WHERE\s+id\s*=\s*(?:\?|\$\d+)/i);
    if (idMatch && params.length) {
      rows = rows.filter(r => r.id === params[0]);
    }
    
    // B. FILTER: WHERE patient_id = ?
    const pidMatch = sql.match(/WHERE\s+patient_id\s*=\s*(?:\?|\$\d+)/i);
    if (pidMatch && params.length) {
      rows = rows.filter(r => r.patient_id === params[0]);
    }
    
    // C. FILTER: WHERE status = ? AND appt_date = ?
    const statusApptMatch = sql.match(/WHERE\s+status\s*=\s*(?:\?|\$\d+)\s+AND\s+appt_date\s*=\s*(?:\?|\$\d+)/i);
    if (statusApptMatch && params.length >= 2) {
      rows = rows.filter(r => r.status === params[0] && r.appt_date === params[1]);
    } else {
      // D. Filter single appointments parameters
      const statusMatch = sql.match(/AND\s+status\s*=\s*(?:\?|\$\d+)/i) || sql.match(/WHERE\s+status\s*=\s*(?:\?|\$\d+)/i);
      if (statusMatch && params.length) {
        const hasDate = sql.includes('appt_date');
        const statusVal = hasDate ? params[params.length - 2] : params[0];
        rows = rows.filter(r => r.status === statusVal);
      }
      
      const dateMatch = sql.match(/AND\s+appt_date\s*=\s*(?:\?|\$\d+)/i) || sql.match(/WHERE\s+appt_date\s*=\s*(?:\?|\$\d+)/i);
      if (dateMatch && params.length) {
        const dateVal = params[params.length - 1];
        rows = rows.filter(r => r.appt_date === dateVal);
      }
    }
    
    // E. Search parsing (ILIKE / LIKE)
    const searchMatch = sql.match(/WHERE\s+name\s+LIKE\s+(?:\?|\$\d+)/i) || sql.match(/name\s+ILIKE\s+(?:\?|\$\d+)/i);
    if (searchMatch && params.length) {
      const q = params[0].replace(/%/g, '').toLowerCase();
      rows = rows.filter(r => 
        (r.name && r.name.toLowerCase().includes(q)) || 
        (r.phone && r.phone.toLowerCase().includes(q)) || 
        (r.chief_complaint && r.chief_complaint.toLowerCase().includes(q))
      );
    }
    
    // F. ORDER BY Sort Emulation
    if (upper.includes('ORDER BY')) {
      const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+(DESC|ASC))?/i);
      if (orderMatch) {
        const field = orderMatch[1].toLowerCase();
        const desc = orderMatch[2] && orderMatch[2].toUpperCase() === 'DESC';
        rows.sort((a, b) => {
          const valA = a[field] || '';
          const valB = b[field] || '';
          if (valA < valB) return desc ? 1 : -1;
          if (valA > valB) return desc ? -1 : 1;
          return 0;
        });
      }
    }
    
    if (isCount) {
      const resultCount = rows.length;
      return { rows: [{ count: resultCount, count_1: resultCount }] };
    }
    
    return { rows };
  }
  
  // 2. INSERT INTO collection
  if (upper.startsWith('INSERT INTO')) {
    const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
    if (!tableMatch) return { rows: [] };
    const tableName = tableMatch[1].toLowerCase();
    
    const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!columnsMatch) return { rows: [] };
    
    const cols = columnsMatch[1].split(',').map(c => c.trim().toLowerCase());
    
    const data = {};
    cols.forEach((col, idx) => {
      let val = params[idx];
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch(e){}
      }
      data[col] = val;
    });
    
    const docId = data.id || generateId(
      tableName === 'patients' ? 'PAT' : 
      tableName === 'appointments' ? 'APPT' : 
      tableName === 'prescriptions' ? 'RX' : 'KIT'
    );
    data.id = docId;
    
    if (!data.created_at) data.created_at = new Date().toISOString();
    if (tableName === 'patients' && !data.last_visit) data.last_visit = new Date().toISOString();
    
    await firestore.collection(tableName).doc(docId).set(data);
    return { rows: [data] };
  }
  
  // 3. UPDATE collection
  if (upper.startsWith('UPDATE')) {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (!tableMatch) return { rows: [] };
    const tableName = tableMatch[1].toLowerCase();
    
    const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
    if (!setMatch) return { rows: [] };
    
    const setClauses = setMatch[1].split(',').map(c => c.trim().split('=')[0].trim().toLowerCase());
    
    const updates = {};
    setClauses.forEach((col, idx) => {
      let val = params[idx];
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch(e){}
      }
      updates[col] = val;
    });
    
    const docId = params[params.length - 1];
    updates.last_visit = new Date().toISOString();
    
    await firestore.collection(tableName).doc(docId).update(updates);
    
    const updatedDoc = await firestore.collection(tableName).doc(docId).get();
    return { rows: [{ id: docId, ...updatedDoc.data() }] };
  }
  
  // 4. DELETE FROM collection
  if (upper.startsWith('DELETE FROM')) {
    const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i);
    if (!tableMatch) return { rows: [] };
    const tableName = tableMatch[1].toLowerCase();
    
    if (params.length) {
      const docId = params[0];
      await firestore.collection(tableName).doc(docId).delete();
    }
    return { rows: [] };
  }
  
  return { rows: [] };
}

// Unified Database Query API
async function query(text, params = []) {
  // A. Prioritize PostgreSQL if active
  if (usePostgres && pgPool) {
    return pgPool.query(text, params);
  }

  // B. Firebase Firestore fallback
  if (useFirebase && firestore) {
    return queryFirestore(text, params);
  }

  // C. SQLite execution fallback
  if (!sqliteDb) initSQLite();
  return new Promise((resolve, reject) => {
    let sql = text.replace(/\$(\d+)/g, '?');
    sql = sql.replace(/\bILIKE\b/gi, 'LIKE');
    sql = sql.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
    
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
              sql = sql.replace(/\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i, (m, colGroup, valGroup) => {
                return `(id, ${colGroup}) VALUES (?, ${valGroup})`;
              });
              params.unshift(insertId);
            }
          }
        }
      }
    }

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

module.exports = {
  query,
  getClient: async () => {
    if (usePostgres && pgPool) {
      return pgPool.connect();
    }
    return {
      query: (text, params) => query(text, params),
      release: () => {},
    };
  },
  useSQLite: () => !useFirebase && !usePostgres,
};
