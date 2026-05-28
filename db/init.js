const fs = require('fs');
const path = require('path');
const db = require('./db');

async function initDB() {
  try {
    // Wait for the database connection probe to complete
    await new Promise(r => setTimeout(r, 200));
    
    if (db.useSQLite && db.useSQLite()) {
      console.log('✅ Local SQLite Database is already fully initialised and seeded at db/homeopathy.db!');
      process.exit(0);
    }
    
    console.log('🔄 Initialising database schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('✅ Database schema ready — Dr. Hiral Mehta Portal DB initialised!');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB init error:', err);
    process.exit(1);
  }
}

initDB();
