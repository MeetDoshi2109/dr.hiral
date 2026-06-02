const db = require('./db');
require('dotenv').config();

async function runTest() {
  try {
    console.log('Testing db.query inserting a test patient...');
    const res = await db.query(
      `INSERT INTO patients (name, age, gender, phone, email, blood_group, address, chief_complaint, history, notes, vitals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      ['Test Firestore Patient', 25, 'Male', '1234567890', 'test@example.com', 'A+', '123 Test St', 'Cough', 'None', 'None', '{}']
    );
    console.log('✅ Query completed successfully!');
    console.log('Result rows:', res.rows);
  } catch (err) {
    console.error('❌ Query failed:', err);
  }
  process.exit(0);
}

runTest();
