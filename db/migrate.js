const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const admin = require('firebase-admin');
require('dotenv').config();

// Ensure Firebase environment variables are present
if (!process.env.FIREBASE_PROJECT_ID) {
  console.error('❌ Error: FIREBASE_PROJECT_ID is missing in .env');
  process.exit(1);
}

// ── 1. Initialize Firebase Admin ─────────────────────────────
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

const firestore = admin.firestore();
console.log('🔥 Connected to Google Firebase Firestore successfully for migration.');

// ── 2. Connect to SQLite ─────────────────────────────────────
const dbPath = path.join(__dirname, 'homeopathy.db');
if (!fs.existsSync(dbPath)) {
  console.error(`❌ SQLite database file not found at: ${dbPath}`);
  process.exit(1);
}

const sqliteDb = new sqlite3.Database(dbPath);
console.log(`🔌 Connected to SQLite database at: ${dbPath}`);

// Helper to query all rows from SQLite
function allSqlite(query, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// List of tables to migrate
const tablesToMigrate = [
  { table: 'patients', collection: 'patients', key: 'id' },
  { table: 'timeline', collection: 'timeline', key: 'id' },
  { table: 'appointments', collection: 'appointments', key: 'id' },
  { table: 'prescriptions', collection: 'prescriptions', key: 'id' },
  { table: 'medicine_kits', collection: 'medicine_kits', key: 'id' },
  { table: 'medicine_stock', collection: 'medicine_stock', key: 'id' },
  { table: 'reviews', collection: 'reviews', key: 'id' },
  { table: 'bug_reports', collection: 'bug_reports', key: 'id' },
  { table: 'patient_documents', collection: 'patient_documents', key: 'id' }
];

async function migrate() {
  try {
    for (const item of tablesToMigrate) {
      console.log(`\n📦 Checking SQLite table: "${item.table}"...`);
      
      // Check if table exists first
      try {
        const rows = await allSqlite(`SELECT * FROM ${item.table}`);
        console.log(`   Found ${rows.length} rows in SQLite.`);
        
        if (rows.length === 0) {
          console.log(`   Skipping: No data to migrate.`);
          continue;
        }

        console.log(`   Uploading to Firestore collection: "${item.collection}"...`);
        const batchSize = 100;
        
        for (let i = 0; i < rows.length; i += batchSize) {
          const chunk = rows.slice(i, i + batchSize);
          const batch = firestore.batch();
          
          chunk.forEach((row) => {
            // Parse JSON columns in SQLite rows before uploading to Firestore
            const cleanRow = { ...row };
            
            // Convert timestamp or ID columns appropriately
            if (cleanRow.vitals && typeof cleanRow.vitals === 'string') {
              try { cleanRow.vitals = JSON.parse(cleanRow.vitals); } catch(e){}
            }
            if (cleanRow.medicines && typeof cleanRow.medicines === 'string') {
              try { cleanRow.medicines = JSON.parse(cleanRow.medicines); } catch(e){}
            }
            if (cleanRow.slots && typeof cleanRow.slots === 'string') {
              try { cleanRow.slots = JSON.parse(cleanRow.slots); } catch(e){}
            }

            // Generate an ID if it's missing or numeric (Firestore docs prefer string IDs)
            let docId = cleanRow[item.key];
            if (docId === undefined || docId === null) {
              docId = firestore.collection(item.collection).doc().id;
              cleanRow[item.key] = docId;
            } else {
              docId = String(docId);
            }

            const docRef = firestore.collection(item.collection).doc(docId);
            batch.set(docRef, cleanRow, { merge: true });
          });
          
          await batch.commit();
          console.log(`   ✅ Migrated rows ${i + 1} to ${Math.min(i + batchSize, rows.length)}.`);
        }
      } catch (err) {
        if (err.message.includes('no such table')) {
          console.log(`   ⚠️ Table "${item.table}" does not exist in SQLite schema. Skipping.`);
        } else {
          console.error(`   ❌ Error migrating table "${item.table}":`, err.message);
        }
      }
    }
    
    console.log('\n🎉 Database migration to Firebase Firestore completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    sqliteDb.close();
    process.exit(0);
  }
}

migrate();
