// ═══════════════════════════════════════════════════
//  GLOBAL APP DATA LAYER  —  Dr. Hiral Mehta Portal
// ═══════════════════════════════════════════════════

const APP = {
  doctorName: 'Dr. Hiral Mehta',
  qualification: 'BHMS, CCH',
  specialty: 'Classical Homeopathy',
  clinic: 'Mehta Homeopathy Wellness Center',
  phone: '+91 98900 05059',
  email: 'hiral.mehta@homeocare.in',
  password: 'Dr.Hiral@_Mehta0000',
  sessionKey: 'hm_auth_session',

  // ── Auth ──────────────────────────────────────────
  login(pwd) {
    if (pwd === this.password) {
      sessionStorage.setItem(this.sessionKey, 'true');
      return true;
    }
    return false;
  },
  logout() { sessionStorage.removeItem(this.sessionKey); },
  isLoggedIn() { return sessionStorage.getItem(this.sessionKey) === 'true'; },

  // ── Patients ──────────────────────────────────────
  getPatients() { return JSON.parse(localStorage.getItem('hm_patients') || '[]'); },
  savePatients(arr) { localStorage.setItem('hm_patients', JSON.stringify(arr)); },
  getPatient(id) { return this.getPatients().find(p => p.id === id) || null; },
  savePatient(patient) {
    const arr = this.getPatients();
    const idx = arr.findIndex(p => p.id === patient.id);
    if (idx >= 0) arr[idx] = patient; else arr.push(patient);
    this.savePatients(arr);
  },
  deletePatient(id) { this.savePatients(this.getPatients().filter(p => p.id !== id)); },
  newPatientId() { return 'PAT-' + Date.now() + '-' + Math.random().toString(36).slice(2,7).toUpperCase(); },

  // ── Appointments ─────────────────────────────────
  getAppointments() { return JSON.parse(localStorage.getItem('hm_appointments') || '[]'); },
  saveAppointments(arr) { localStorage.setItem('hm_appointments', JSON.stringify(arr)); },
  saveAppointment(appt) {
    const arr = this.getAppointments();
    const idx = arr.findIndex(a => a.id === appt.id);
    if (idx >= 0) arr[idx] = appt; else arr.push(appt);
    this.saveAppointments(arr);
  },
  deleteAppointment(id) { this.saveAppointments(this.getAppointments().filter(a => a.id !== id)); },
  newApptId() { return 'APPT-' + Date.now(); },

  // ── Medicine Kits ─────────────────────────────────
  getKits() { return JSON.parse(localStorage.getItem('hm_kits') || '[]'); },
  saveKits(arr) { localStorage.setItem('hm_kits', JSON.stringify(arr)); },
  saveKit(kit) {
    const arr = this.getKits();
    const idx = arr.findIndex(k => k.id === kit.id);
    if (idx >= 0) arr[idx] = kit; else arr.push(kit);
    this.saveKits(arr);
  },
  deleteKit(id) { this.saveKits(this.getKits().filter(k => k.id !== id)); },
  newKitId() { return 'KIT-' + Date.now(); },

  // ── Prescriptions ─────────────────────────────────
  getPrescriptions() { return JSON.parse(localStorage.getItem('hm_prescriptions') || '[]'); },
  savePrescriptions(arr) { localStorage.setItem('hm_prescriptions', JSON.stringify(arr)); },
  savePrescription(rx) {
    const arr = this.getPrescriptions();
    const idx = arr.findIndex(r => r.id === rx.id);
    if (idx >= 0) arr[idx] = rx; else arr.push(rx);
    this.savePrescriptions(arr);
  },
  newRxId() { return 'RX-' + Date.now(); },

  // ── Utility ───────────────────────────────────────
  formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  },
  formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  },
  today() { return new Date().toISOString().split('T')[0]; },
  now() { return new Date().toISOString(); },

  // ── Toast Notifications ───────────────────────────
  toast(msg, type = 'info', duration = 3000) {
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const container = document.getElementById('toast-container') || (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ── Modal helpers ─────────────────────────────────
  openModal(id) { document.getElementById(id)?.classList.add('active'); },
  closeModal(id) { document.getElementById(id)?.classList.remove('active'); },
};

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// Seed demo data if empty
(function seedDemo() {
  if (APP.getPatients().length > 0) return;
  const demoPatients = [
    {
      id: 'PAT-DEMO001', name: 'Priya Sharma', age: 32, gender: 'Female',
      phone: '9876543210', email: 'priya@email.com', bloodGroup: 'O+',
      address: '12, Rose Lane, Ahmedabad', chief_complaint: 'Chronic Migraine',
      history: 'Recurring migraines for 5 years, worse in summers',
      createdAt: '2025-01-15T10:00:00Z', lastVisit: '2025-04-20T09:30:00Z',
      prescriptions: [], notes: 'Patient responds well to Belladonna 30',
      vitals: { bp: '118/76', weight: '58 kg', temp: '98.6°F' },
      timeline: [
        { date: '2025-01-15', note: 'Initial consultation. Started Belladonna 30.', remedy: 'Belladonna 30' },
        { date: '2025-02-10', note: 'Significant improvement. Reduced frequency.', remedy: 'Nat Mur 200' },
        { date: '2025-04-20', note: 'Follow-up. Continuing treatment.', remedy: 'Belladonna 30' }
      ]
    },
    {
      id: 'PAT-DEMO002', name: 'Rajesh Patel', age: 45, gender: 'Male',
      phone: '9765432109', email: 'rajesh@email.com', bloodGroup: 'A+',
      address: '34, Shanti Nagar, Surat', chief_complaint: 'Rheumatoid Arthritis',
      history: 'Joint pain and stiffness, aggravated in cold weather',
      createdAt: '2025-02-01T11:00:00Z', lastVisit: '2025-05-01T10:00:00Z',
      prescriptions: [], notes: 'Rhus Tox works well for this patient',
      vitals: { bp: '130/84', weight: '72 kg', temp: '98.2°F' },
      timeline: [
        { date: '2025-02-01', note: 'First visit. Severe stiffness.', remedy: 'Rhus Tox 30' },
        { date: '2025-03-15', note: 'Marked improvement.', remedy: 'Rhus Tox 200' }
      ]
    },
    {
      id: 'PAT-DEMO003', name: 'Anita Desai', age: 28, gender: 'Female',
      phone: '9654321098', email: 'anita@email.com', bloodGroup: 'B+',
      address: '7, Gandhi Road, Vadodara', chief_complaint: 'Anxiety & Insomnia',
      history: 'Severe anxiety attacks, difficulty sleeping, work stress',
      createdAt: '2025-03-10T09:00:00Z', lastVisit: '2025-04-25T10:00:00Z',
      prescriptions: [], notes: 'Aconite and Ignatia alternating',
      vitals: { bp: '112/72', weight: '52 kg', temp: '98.4°F' },
      timeline: [
        { date: '2025-03-10', note: 'Initial visit. Panic attacks.', remedy: 'Aconite 200' },
        { date: '2025-04-25', note: 'Much calmer. Sleeping better.', remedy: 'Ignatia 30' }
      ]
    }
  ];
  APP.savePatients(demoPatients);

  const demoAppts = [
    { id: 'APPT-DEMO001', patientName: 'Meera Joshi', phone: '9543210987', email: 'meera@email.com', date: APP.today(), time: '10:00', reason: 'First consultation - skin allergy', status: 'pending', createdAt: APP.now() },
    { id: 'APPT-DEMO002', patientName: 'Suresh Kumar', phone: '9432109876', email: 'suresh@email.com', date: APP.today(), time: '11:30', reason: 'Follow-up for diabetes', status: 'pending', createdAt: APP.now() },
    { id: 'APPT-DEMO003', patientName: 'Priya Sharma', phone: '9876543210', email: 'priya@email.com', date: APP.today(), time: '14:00', reason: 'Migraine follow-up', status: 'accepted', createdAt: APP.now() }
  ];
  APP.saveAppointments(demoAppts);
})();
