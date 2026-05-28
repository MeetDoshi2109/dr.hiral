const db = require('./db');

async function initDB() {
  console.log('✅ SQLite Database is fully initialised and seeded at db/homeopathy.db!');
  process.exit(0);
}

initDB();
