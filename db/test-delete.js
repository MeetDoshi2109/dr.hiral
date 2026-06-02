const db = require('./db');
require('dotenv').config();

async function runTest() {
  try {
    console.log('Testing patient deletion...');
    const patientId = 'PAT-TESTDEL';
    
    // 1. Insert patient
    console.log('Inserting test patient...');
    await db.query(
      `INSERT INTO patients (id, name, age, gender, phone, email, blood_group, address, chief_complaint, history, notes, vitals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [patientId, 'Temp Delete Patient', 30, 'Female', '0000000000', 'temp@example.com', 'O-', 'Test Address', 'None', 'None', 'None', '{}']
    );
    
    // 2. Verify existence
    console.log('Verifying existence...');
    const selectRes = await db.query('SELECT * FROM patients WHERE id=$1', [patientId]);
    console.log('Found patients:', selectRes.rows.length);
    
    // 3. Delete patient
    console.log('Deleting test patient...');
    await db.query('DELETE FROM patients WHERE id=$1', [patientId]);
    
    // 4. Verify gone
    console.log('Verifying patient is gone...');
    const selectRes2 = await db.query('SELECT * FROM patients WHERE id=$1', [patientId]);
    console.log('Found patients after delete:', selectRes2.rows.length);
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
  process.exit(0);
}

runTest();
