-- ═══════════════════════════════════════════════════════
--  Dr. Hiral Mehta Homeopathy Portal — PostgreSQL Schema
-- ═══════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Patients ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id            TEXT PRIMARY KEY DEFAULT 'PAT-' || upper(substr(md5(random()::text), 1, 8)),
  name          TEXT NOT NULL,
  age           INTEGER,
  gender        TEXT,
  phone         TEXT,
  email         TEXT,
  blood_group   TEXT,
  address       TEXT,
  chief_complaint TEXT,
  history       TEXT,
  notes         TEXT,
  vitals        JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_visit    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Patient Timeline ──────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline (
  id          SERIAL PRIMARY KEY,
  patient_id  TEXT REFERENCES patients(id) ON DELETE CASCADE,
  visit_date  DATE DEFAULT CURRENT_DATE,
  note        TEXT,
  remedy      TEXT,
  potency     TEXT,
  dosage      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Appointments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id            TEXT PRIMARY KEY DEFAULT 'APPT-' || upper(substr(md5(random()::text), 1, 8)),
  patient_name  TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  appt_date     DATE NOT NULL,
  appt_time     TEXT NOT NULL,
  reason        TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reject_reason TEXT,
  patient_id    TEXT REFERENCES patients(id) ON DELETE SET NULL,
  mode          TEXT DEFAULT 'offline',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Prescriptions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id            TEXT PRIMARY KEY DEFAULT 'RX-' || upper(substr(md5(random()::text), 1, 8)),
  patient_id    TEXT REFERENCES patients(id) ON DELETE CASCADE,
  patient_name  TEXT,
  medicines     JSONB DEFAULT '[]',
  instructions  TEXT,
  follow_up     DATE,
  issued_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Medicine Kits ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_kits (
  id          TEXT PRIMARY KEY DEFAULT 'KIT-' || upper(substr(md5(random()::text), 1, 8)),
  name        TEXT NOT NULL,
  description TEXT,
  slots       JSONB DEFAULT '[]',
  template    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appt_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_timeline_patient ON timeline(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);


-- ── Patient Reviews ──────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  text        TEXT NOT NULL,
  location    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bug Reports ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS bug_reports (
  id          SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  status      TEXT DEFAULT 'pending',
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Patient Documents ────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_documents (
  id          SERIAL PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doc_name    TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  notes       TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── Medicine Stock ───────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_stock (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  potency       TEXT,
  qty           REAL DEFAULT 0,
  unit          TEXT DEFAULT 'grams',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

