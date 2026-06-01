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

-- ── Demo seed ─────────────────────────────────────────
INSERT INTO patients (id, name, age, gender, phone, email, blood_group, address, chief_complaint, history, notes)
VALUES
  ('PAT-DEMO001','Priya Sharma',32,'Female','9876543210','priya@email.com','O+','12, Rose Lane, Ahmedabad','Chronic Migraine','Recurring migraines for 5 years, worse in summers','Responds well to Belladonna 30'),
  ('PAT-DEMO002','Rajesh Patel',45,'Male','9765432109','rajesh@email.com','A+','34, Shanti Nagar, Surat','Rheumatoid Arthritis','Joint pain and stiffness, aggravated in cold weather','Rhus Tox works well'),
  ('PAT-DEMO003','Anita Desai',28,'Female','9654321098','anita@email.com','B+','7, Gandhi Road, Vadodara','Anxiety & Insomnia','Severe anxiety attacks, work stress','Aconite and Ignatia alternating')
ON CONFLICT (id) DO NOTHING;

INSERT INTO timeline (patient_id, visit_date, note, remedy, potency)
VALUES
  ('PAT-DEMO001','2025-01-15','Initial consultation. Started Belladonna 30.','Belladonna','30C'),
  ('PAT-DEMO001','2025-02-10','Significant improvement. Reduced frequency.','Nat Mur','200C'),
  ('PAT-DEMO001','2025-04-20','Follow-up. Continuing treatment.','Belladonna','30C'),
  ('PAT-DEMO002','2025-02-01','First visit. Severe stiffness.','Rhus Tox','30C'),
  ('PAT-DEMO002','2025-03-15','Marked improvement.','Rhus Tox','200C'),
  ('PAT-DEMO003','2025-03-10','Initial visit. Panic attacks.','Aconite','200C'),
  ('PAT-DEMO003','2025-04-25','Much calmer. Sleeping better.','Ignatia','30C')
ON CONFLICT DO NOTHING;

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

-- Seed reviews if table is empty
INSERT INTO reviews (name, rating, text, location)
VALUES
  ('Priya Sharma', 5, 'Dr. Hiral cured my 7-year chronic migraine in just 3 months. No side effects. I recommend her to everyone!', 'Ahmedabad'),
  ('Rajesh Patel', 5, 'The QR code system is brilliant. I can see all my records and prescriptions anytime I want.', 'Surat'),
  ('Anita Desai', 5, 'My anxiety is completely gone after 4 months. She truly listens and finds the root cause.', 'Vadodara')
ON CONFLICT DO NOTHING;

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

