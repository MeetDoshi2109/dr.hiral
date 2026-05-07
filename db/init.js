const fs = require('fs');
const path = require('path');
const db = require('./db');

async function initDB() {
  try {
    console.log('🔄 Initialising database schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('✅ Database schema ready — Dr. Hiral Mehta Portal DB initialised!');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB init error:', err.message);
    process.exit(1);
  }
}

initDB();
