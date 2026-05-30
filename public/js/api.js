// ═══════════════════════════════════════
//  Frontend API Client  —  fetch wrapper
// ═══════════════════════════════════════

const API = {
  base: '',   // same-origin; works on localhost and Render

  async req(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  get:    (url)       => API.req('GET',    url),
  post:   (url, body) => API.req('POST',   url, body),
  put:    (url, body) => API.req('PUT',    url, body),
  patch:  (url, body) => API.req('PATCH',  url, body),
  delete: (url)       => API.req('DELETE', url),

  // Auth
  login:  (pwd)  => API.post('/api/auth/login',  { password: pwd }),
  logout: ()     => API.post('/api/auth/logout', {}),
  status: ()     => API.get('/api/auth/status'),

  // Stats
  stats: () => API.get('/api/stats'),

  // Patients
  getPatients:  (search) => API.get(`/api/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getPatient:   (id)     => API.get(`/api/patients/${id}`),
  createPatient:(data)   => API.post('/api/patients', data),
  updatePatient:(id,data)=> API.put(`/api/patients/${id}`, data),
  deletePatient:(id)     => API.delete(`/api/patients/${id}`),
  addTimeline:  (id,data)=> API.post(`/api/patients/${id}/timeline`, data),
  addPrescription:(id,d) => API.post(`/api/patients/${id}/prescriptions`, d),
  deletePrescription:(pid,rid)=> API.delete(`/api/patients/${pid}/prescriptions/${rid}`),
  getPrescriptions:()    => API.get('/api/prescriptions'),

  // Patients lookup (returning patient flow)
  lookupPatient: (q) => API.get(`/api/patients/lookup?q=${encodeURIComponent(q)}`),

  // QR
  getQR: (patientId) => API.get(`/api/qr/${patientId}`),

  // Appointments
  getAppointments: (params={}) => {
    const q = new URLSearchParams(params).toString();
    return API.get(`/api/appointments${q ? '?'+q : ''}`);
  },
  bookAppointment: (data)   => API.post('/api/appointments', data),
  acceptAppt:      (id)     => API.patch(`/api/appointments/${id}/accept`, {}),
  rejectAppt:      (id,reason) => API.patch(`/api/appointments/${id}/reject`, { reason }),
  deleteAppt:      (id)     => API.delete(`/api/appointments/${id}`),

  // Kits
  getKits:   ()       => API.get('/api/kits'),
  getKit:    (id)     => API.get(`/api/kits/${id}`),
  createKit: (data)   => API.post('/api/kits', data),
  updateKit: (id,d)   => API.put(`/api/kits/${id}`, d),
  deleteKit: (id)     => API.delete(`/api/kits/${id}`),

  // Reviews
  getReviews: () => API.get('/api/reviews'),
  addReview:  (data) => API.post('/api/reviews', data),

  // Bugs
  getBugs:    () => API.get('/api/bugs'),
  submitBug:  (desc) => API.post('/api/bugs', { description: desc }),
  resolveBug: (id) => API.post(`/api/bugs/${id}/resolve`, {}),
};

// ── Toast ────────────────────────────────────────────
function toast(msg, type='info', duration=3500) {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span style="font-size:1.1rem">${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(60px)';
    el.style.transition = '0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ── Modal helpers ────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
});

// ── Format helpers ───────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}
function today() { return new Date().toISOString().split('T')[0]; }
