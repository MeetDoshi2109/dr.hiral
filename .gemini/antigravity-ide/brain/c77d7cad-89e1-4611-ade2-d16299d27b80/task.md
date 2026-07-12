# Task Checklist

- [x] Database Schema & Migrations
  - [x] Add `proforma_data` to `db/schema.sql` (Postgres)
  - [x] Add `proforma_data` to `db/db.js` (SQLite & Postgres creation code)
- [x] Backend API updates
  - [x] Update POST/PUT handlers in `routes/patients.js` to process and store `proforma_data`
- [x] Frontend UI Redesign & Logic
  - [x] Redesign Proforma modal in `public/dashboard.html` with modern grid and card tabs
  - [x] Update `openCaseRecord(id)` to load `proforma_data` into fields
  - [x] Update `saveCaseRecord(e)` to write the JSON representation to patient's `proforma_data`
- [/] Verification
  - [ ] Verify form persistence works by saving and reopening
