const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to the service account credentials JSON
const serviceAccountPath = path.join(__dirname, '..', '..', 'drhiral-504a4-firebase-adminsdk-fbsvc-2e1fe4e661.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Credentials file not found at: ${serviceAccountPath}`);
  process.exit(1);
}

console.log('⚙️ Loading Firebase credentials...');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

console.log('🔥 Connecting to Google Cloud Firestore...');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

const patients = [
  { id: 'PAT-DEMO001', name: 'Priya Sharma', age: 32, gender: 'Female', phone: '9876543210', email: 'priya@email.com', blood_group: 'O+', address: '12, Rose Lane, Ahmedabad', chief_complaint: 'Chronic Migraine', history: 'Recurring migraines for 5 years, worse in summers', notes: 'Responds well to Belladonna 30', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() },
  { id: 'PAT-DEMO002', name: 'Rajesh Patel', age: 45, gender: 'Male', phone: '9765432109', email: 'rajesh@email.com', blood_group: 'A+', address: '34, Shanti Nagar, Surat', chief_complaint: 'Rheumatoid Arthritis', history: 'Joint pain and stiffness, aggravated in cold weather', notes: 'Rhus Tox works well', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() },
  { id: 'PAT-DEMO003', name: 'Anita Desai', age: 28, gender: 'Female', phone: '9654321098', email: 'anita@email.com', blood_group: 'B+', address: '7, Gandhi Road, Vadodara', chief_complaint: 'Anxiety & Insomnia', history: 'Severe anxiety attacks, work stress', notes: 'Aconite and Ignatia alternating', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() },
  { id: 'PAT-DEMO004', name: 'Vikram Malhotra', age: 38, gender: 'Male', phone: '9543210987', email: 'vikram@email.com', blood_group: 'AB+', address: '45, Sea Breeze Heights, Bandra, Mumbai', chief_complaint: 'Acid Reflux & GERD', history: 'Chronic acidity, heartburn, bloating after meals', notes: 'Prescribed Nux Vomica and Robinia', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() },
  { id: 'PAT-DEMO005', name: 'Sunita Rao', age: 52, gender: 'Female', phone: '9432109876', email: 'sunita@email.com', blood_group: 'O-', address: '89, Orchid Green Society, Baner, Pune', chief_complaint: 'Chronic Eczema', history: 'Dry, itchy skin eruptions on hands and elbows for 3 years', notes: 'Responds excellently to Sulphur and Graphites', vitals: {}, created_at: new Date().toISOString(), last_visit: new Date().toISOString() }
];

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

const appointments = [
  { id: 'APPT-DEMO001', patient_name: 'Priya Sharma', phone: '9876543210', email: 'priya@email.com', appt_date: '2026-06-01', appt_time: '10:00', reason: 'Migraine Follow-up', status: 'pending', created_at: new Date().toISOString() },
  { id: 'APPT-DEMO002', patient_name: 'Rajesh Patel', phone: '9765432109', email: 'rajesh@email.com', appt_date: '2026-06-01', appt_time: '11:30', reason: 'Joint Pain Follow-up', status: 'approved', created_at: new Date().toISOString() }
];

const reviews = [
  { id: 'REV-001', name: 'Meera Johar', rating: 5, text: 'Excellent diagnosis and very gentle treatment. Highly recommended!', location: 'Ahmedabad', created_at: new Date().toISOString() },
  { id: 'REV-002', name: 'Amit Shah', rating: 5, text: 'My chronic migraines are completely cured thanks to Dr. Hiral!', location: 'Bandra, Mumbai', created_at: new Date().toISOString() }
];

async function seed() {
  console.log('🔄 Seeding Patients...');
  const batch = firestore.batch();

  patients.forEach(p => {
    const ref = firestore.collection('patients').doc(p.id);
    batch.set(ref, p);
  });

  timeline.forEach(t => {
    const ref = firestore.collection('timeline').doc(t.id);
    batch.set(ref, t);
  });

  appointments.forEach(a => {
    const ref = firestore.collection('appointments').doc(a.id);
    batch.set(ref, a);
  });

  reviews.forEach(r => {
    const ref = firestore.collection('reviews').doc(r.id);
    batch.set(ref, r);
  });

  await batch.commit();
  console.log('✅ Firestore has been successfully seeded!');
  console.log('✨ Check your Firebase Console now!');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
});
