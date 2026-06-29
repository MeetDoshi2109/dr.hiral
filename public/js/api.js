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
  login:  (pwd, role)  => API.post('/api/auth/login',  { password: pwd, role }),
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
  getDocuments:    (pid)      => API.get(`/api/patients/${pid}/documents`),
  uploadDocument:  (pid,data) => API.post(`/api/patients/${pid}/documents`, data),
  editDocument:    (pid,did,d)=> API.put(`/api/patients/${pid}/documents/${did}`, d),
  deleteDocument:  (pid,did)  => API.delete(`/api/patients/${pid}/documents/${did}`),

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

  // Stock
  getStock:   (search) => API.get(`/api/stock${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  addStock:   (data) => API.post('/api/stock', data),
  updateStock: (id,data) => API.put(`/api/stock/${id}`, data),
  deleteStock: (id) => API.delete(`/api/stock/${id}`),
  reorderStock: (id, status) => API.post(`/api/stock/${id}/reorder`, { reorder: status }),

  // Bills
  getBills:   (pid) => API.get(`/api/bills${pid ? `?patient_id=${pid}` : ''}`),
  createBill: (data) => API.post('/api/bills', data),
  updateBillStatus: (id, status) => API.patch(`/api/bills/${id}/status`, { status }),
  deleteBill: (id) => API.delete(`/api/bills/${id}`),
};

// ── Global Helpers ────────────────────────────────────
function clearPatientSession() {
  localStorage.removeItem('my_patient_id');
  localStorage.removeItem('my_appointment_id');
  location.href = '/patient.html';
}

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

// ── Language Translation Engine (Google Translate) ──
(function() {
  // Inject Google Translate CSS to hide Google bar
  const style = document.createElement('style');
  style.textContent = `
    .skiptranslate, iframe.skiptranslate, #goog-gt-tt, .goog-te-banner-frame, .goog-te-balloon-frame {
      display: none !important;
    }
    body {
      top: 0 !important;
    }
  `;
  document.head.appendChild(style);

  // Create Google Translate mount point
  const div = document.createElement('div');
  div.id = 'google_translate_element';
  div.style.display = 'none';
  document.body.appendChild(div);

  // Global callback for Google Translate init
  window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'hi,en',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false
    }, 'google_translate_element');
  };

  // Load Google Translate script
  const script = document.createElement('script');
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.head.appendChild(script);

  // Setup language button label update and icon protection on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // Automatically apply 'notranslate' class to all material icons to prevent Google Translate from breaking them
    const protectIcons = (container) => {
      if (!container || typeof container.querySelectorAll !== 'function') return;
      const icons = container.querySelectorAll('.material-symbols-outlined');
      icons.forEach(icon => {
        icon.classList.add('notranslate');
      });
    };

    protectIcons(document);

    // Watch for dynamically added elements to ensure they get 'notranslate'
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // ELEMENT_NODE
            if (node.classList && node.classList.contains('material-symbols-outlined')) {
              node.classList.add('notranslate');
            }
            protectIcons(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const currentLang = localStorage.getItem('lang') || 'en';
    
    // Correct translation of "Hiral" to "हिरल" in Hindi mode
    const fixHiralHindiTranslation = () => {
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walk.nextNode()) {
        const text = node.nodeValue;
        if (text && (text.includes('हीराल') || text.includes('हिराल') || text.includes('हीरल'))) {
          node.nodeValue = text.replace(/हीराल/g, 'हिरल').replace(/हिराल/g, 'हिरल').replace(/हीरल/g, 'हिरल');
        }
      }
    };

    if (currentLang === 'hi') {
      fixHiralHindiTranslation();
      setTimeout(fixHiralHindiTranslation, 500);
      setTimeout(fixHiralHindiTranslation, 1000);
      setTimeout(fixHiralHindiTranslation, 2000);
      setTimeout(fixHiralHindiTranslation, 3000);
      
      const translationObserver = new MutationObserver((mutations) => {
        translationObserver.disconnect();
        fixHiralHindiTranslation();
        translationObserver.observe(document.body, { characterData: true, subtree: true, childList: true });
      });
      translationObserver.observe(document.body, { characterData: true, subtree: true, childList: true });
    }

    const langBtnText = document.getElementById('lang-text');
    if (langBtnText) {
      langBtnText.textContent = currentLang === 'hi' ? 'EN' : 'हिं';
    }
  });


  // Global toggle language function
  window.toggleLanguage = function() {
    const currentLang = localStorage.getItem('lang') || 'en';
    const nextLang = currentLang === 'hi' ? 'en' : 'hi';
    localStorage.setItem('lang', nextLang);
    
    const domain = window.location.hostname;
    const hostParts = domain.split('.');
    let domainWildcard = '';
    if (hostParts.length > 1) {
      domainWildcard = '.' + hostParts.slice(-2).join('.');
    }
    
    if (nextLang === 'en') {
      // Robustly delete the googtrans cookie for all possible scopes
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
      if (domainWildcard) {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domainWildcard}`;
      }
      if (domain === 'localhost') {
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost";
      }
    } else {
      // Set the googtrans cookie to Hindi
      document.cookie = `googtrans=/en/hi; path=/;`;
      document.cookie = `googtrans=/en/hi; path=/; domain=${domain}`;
      if (domainWildcard) {
        document.cookie = `googtrans=/en/hi; path=/; domain=${domainWildcard}`;
      }
      if (domain === 'localhost') {
        document.cookie = "googtrans=/en/hi; path=/; domain=localhost";
      }
    }
    
    location.reload();
  };
})();
