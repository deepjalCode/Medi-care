# OPD Management App — Agentic Developer Prompt v2.0
**Builds On:** v1.0 Implementation Plan (Phases 1–6 already defined)  
**Stack:** React Native 0.84 (Bare) + Supabase + Redux  
**Scope:** Schema Migration, Auth Overhaul, Token Engine Upgrade, Profile Photo System  
**Execution Mode:** Autonomous — read full codebase before touching any file

---

## MANDATORY PRE-EXECUTION CHECKLIST

Before writing a single line of code, you must:

1. **Read every existing file** in `Walkthrough.md` and `Architecture Map.md`
2. **Map the current data model** — document every column in `users`, `patients`, `doctors`, `appointments` tables
3. **Identify all places `email` is used** — in auth flows, forms, Supabase queries, Redux state, display components — list them exhaustively before removing any
4. **Identify all places login is implemented** — `AuthNavigator`, login screen, `authSlice`, `userService` — map the full auth flow before touching it
5. **Read the existing seed data** — understand the 5 seeded doctors (1 per category) already in the database from v1.0
6. **State your execution plan** in comments at the top of each modified file: what you changed and why

Do not begin implementation until this audit is complete and documented.

---

## SYSTEM CONTEXT

This is an OPD Management App with three roles: **Admin**, **Doctor**, **Patient**.

**Current auth model (being replaced):** Email + password via Supabase Auth  
**Target auth model:** Role-specific ID + password login  
**Backend:** Supabase (PostgreSQL + Realtime + Storage)  
**Existing seeded doctors (from v1.0):**

| Doctor Name | Category | Category Code |
|---|---|---|
| Dr. Aryan Mehta | General Physician | GN |
| Dr. Kavita Rao | ENT | EN |
| Dr. Anjali Bose | Pediatrics | PE |
| Dr. Harish Reddy | Orthopedics | OR |
| Dr. Nisha Agarwal | Dermatology | DE |

These 5 records are the source of truth for all category-related logic throughout the app. Do not hardcode category lists anywhere — always derive them from this seeded data in the database.

---

## FEATURE 1 — ENTITY ATTRIBUTE OVERHAUL

### 1.1 Remove Email from All Entities

**Scope:** Database schema, all forms, all display components, all service calls, Redux state.

**Database migration:**
```sql
ALTER TABLE patients DROP COLUMN IF EXISTS email;
ALTER TABLE doctors DROP COLUMN IF EXISTS email;
ALTER TABLE admins DROP COLUMN IF EXISTS email;
```

**Code — audit and remove email from:**
- All registration forms (Admin registration of patient, Doctor registration, Patient self-registration)
- All profile display components
- `userService.ts` — remove email from `createUserProfile()`, `getUserProfile()`, any query selecting or filtering by email
- `authSlice.ts` — remove email from user state shape
- `AppHeader` / `ProfilePanel` — remove email display
- All TypeScript interfaces/types that include `email` on Patient, Doctor, or Admin entities

**Validation:** After removal, `npx tsc --noEmit` must produce zero email-related type errors.

---

### 1.2 ID-Based Login System

Replace the current email + password Supabase Auth flow with role-specific ID + password authentication.

#### ID Format Specification

| Role | ID Format | Example |
|---|---|---|
| Patient | `PAT-XXXXXX` | `PAT-000001` |
| Doctor | `DOC-XXXXXX` | `DOC-000001` |
| Admin | `ADM-XXXXXX` | `ADM-000001` |

`XXXXXX` is a zero-padded sequential integer, auto-incremented per role via a Supabase sequence. Never derive the sequence number by counting existing rows — that breaks on deletion.

#### Database — Sequences and RPC Functions
```sql
CREATE SEQUENCE IF NOT EXISTS patient_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS doctor_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS admin_id_seq START 1;

CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TEXT AS $$
  SELECT 'PAT-' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION generate_doctor_id()
RETURNS TEXT AS $$
  SELECT 'DOC-' || LPAD(nextval('doctor_id_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION generate_admin_id()
RETURNS TEXT AS $$
  SELECT 'ADM-' || LPAD(nextval('admin_id_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;
```

#### Authentication Strategy

Supabase Auth is email-based internally. Bridge this using a **synthetic email pattern** — never exposed to the user.

**Registration flow:**
1. Generate role ID via RPC (`PAT-000001`, `DOC-000001`, etc.)
2. Create Supabase Auth account: `email = {role_id}@opd.internal`, `password = user-provided`
3. Store role ID, role type, and `auth.uid` in the respective table
4. **Display the generated ID to the admin/user immediately** in a modal after successful registration
5. Include a "Copy ID" button and the message: *"Save this ID — it is required for login"*

**Login flow:**
1. User enters Role ID + password
2. App constructs synthetic email: `{entered_id}@opd.internal`
3. Call `supabase.auth.signInWithPassword({ email: synthetic_email, password })`
4. On success, fetch user profile by `auth.uid` to determine role, route to correct navigator

**Synthetic email is an implementation detail — never display it in UI, logs, or error messages shown to users.**

**`[MODIFY] userService.ts`**
- `registerUser(role, name, password, ...fields)` → generates ID via RPC, creates auth account, stores profile
- `loginWithRoleId(roleId, password)` → constructs synthetic email, calls Supabase signIn, returns user profile
- Remove all real email references from auth calls

**`[MODIFY] LoginScreen.tsx`**
- Replace email input with Role ID input
- Label: *"Enter your ID (e.g. PAT-000001)"*
- Validation pattern: `^(PAT|DOC|ADM)-\d{6}$`
- Error message if format is invalid before attempting auth

**`[MODIFY] authSlice.ts`**
- Replace `email` field in user state shape with `roleId`
- Update all selectors accordingly

---

### 1.3 Reason for Visit in Token Generation

Add a mandatory `reason_for_visit` field to the appointment/token creation flow.

**Database:**
```sql
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason_for_visit TEXT NOT NULL DEFAULT '';
```

**`[MODIFY] RenewTokenScreen.tsx`** and **`[MODIFY] AdminDashboard.tsx`** token generation form:
- Add `TextInput`: label *"Reason for Visit"*, multiline, max 200 characters
- Mandatory — token generation button is disabled until this field has at least 5 characters
- Character counter displayed below the field

**Display `reason_for_visit` in:**
- Doctor Dashboard → patient queue card (truncated to 60 chars with "..." if longer)
- Patient Dashboard → active token card
- ProfilePanel → Patient active token section

**`[MODIFY] appointmentService.ts`**
- Add `reason_for_visit` to `createAppointment()` parameters and Supabase insert

---

### 1.4 Profile Photo System

Each entity (Patient, Doctor, Admin) must support a profile photo stored in Supabase Storage.

#### Storage Configuration
```
Bucket: profile-photos
Access policy: Public read, authenticated write
Path: profile-photos/{auth_uid}/avatar.jpg
Behavior: Upsert — uploading a new photo overwrites the existing one
```

**Database:**
```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

**`[NEW] src/services/photoService.ts`**
```typescript
// uploadProfilePhoto(authUid: string, imageUri: string): Promise<string>
//   - Uploads image to profile-photos/{authUid}/avatar.jpg
//   - Returns public URL of uploaded photo
//   - Updates photo_url in the user's respective table

// getProfilePhotoUrl(authUid: string): string
//   - Returns constructed public URL
//   - Returns default placeholder URL if photo does not exist
```

**`[NEW] src/hooks/useProfilePhoto.ts`**
- Wraps photoService with loading/error state
- Exposes `{ photoUrl, uploadPhoto, isUploading, error }`

**Update Profile UI:**
- Every role must have an "Update Profile" section within their ProfilePanel
- Shows current photo (or initials-based placeholder: first letter of name on colored background)
- "Change Photo" button → opens device image picker
- On image selection → upload immediately, show progress indicator, update display on completion

**`[MODIFY] package.json`**
- Add `react-native-image-picker`

**Display profile photo in:**
- `AppHeader` profile button → avatar thumbnail
- `ProfilePanel` → top of panel, large avatar
- Doctor Dashboard → patient queue cards (patient avatar)
- Admin patient/doctor list views → avatar in list items
- Placeholder rule: if `photo_url` is null → show colored circle with first initial of name

---

## FEATURE 2 — TOKEN GENERATION OVERHAUL

### 2.1 Admin Post-Registration Token Generation

When an Admin registers a new patient, add an immediate token generation step after account creation.

**Flow:**
1. Admin completes patient registration → submits
2. Patient account created → generated Patient ID shown in confirmation modal
3. Same modal shows a second prompt: *"Generate a token for this patient now?"*
4. **Yes** → inline token form expands within the modal (do not navigate away):
   - Doctor category picker (fetched from `doctors` table — not hardcoded)
   - Doctor picker (filtered by selected category, shows only `availability = true` doctors)
   - Reason for Visit field (mandatory, min 5 chars)
   - "Generate Token" button
5. On success → show: Token number, assigned doctor name, current queue position
6. **Skip** → close modal, return to admin dashboard

**`[MODIFY] RegisterPatientScreen.tsx` or `AdminDashboard.tsx`**
- Add post-registration modal with the above two-step flow
- Reuse `appointmentService.createAppointment()` — do not write separate token creation logic

---

### 2.2 Doctor Category Picker — Always From Database

**Hard rule:** The category list in any token generation picker must always be fetched from the `doctors` table. No static arrays in components.

**`[MODIFY or NEW] doctorService.ts`**
```typescript
export async function getDoctorCategories(): Promise<string[]> {
  const { data } = await supabase
    .from('doctors')
    .select('category')
    .eq('availability', true);
  return [...new Set(data?.map(d => d.category) ?? [])];
}

export async function getDoctorsByCategory(category: string) {
  return supabase
    .from('doctors')
    .select('doctor_id, name, category, category_code, availability, photo_url')
    .eq('category', category)
    .eq('availability', true);
}
```

**`[MODIFY] RenewTokenScreen.tsx`** and admin token form:
- On mount → call `getDoctorCategories()` → render category picker
- On category selection → call `getDoctorsByCategory()` → render doctor picker
- Both pickers show loading skeleton while fetching
- If no doctors available in a category → show *"No doctors available in this category"* message

---

## FEATURE 3 — SEEDED DOCTOR DATA INTEGRITY

### 3.1 Updated Seed Script

**`[MODIFY] seedDoctors.ts`** — update to include all new fields, remove email:

| Name | Category | Category Code | Generated Login ID | Default Password |
|---|---|---|---|---|
| Dr. Aryan Mehta | General Physician | GN | DOC-000001 | Doctor@1234 |
| Dr. Kavita Rao | ENT | EN | DOC-000002 | Doctor@1234 |
| Dr. Anjali Bose | Pediatrics | PE | DOC-000003 | Doctor@1234 |
| Dr. Harish Reddy | Orthopedics | OR | DOC-000004 | Doctor@1234 |
| Dr. Nisha Agarwal | Dermatology | DE | DOC-000005 | Doctor@1234 |

Each record must include: `doctor_id`, `name`, `category`, `category_code`, `availability: true`, `photo_url: null`.  
Supabase Auth account: synthetic email `{doctor_id}@opd.internal`, password `Doctor@1234`.  
**Idempotency:** Check by `doctor_id` or `name` before inserting. Running twice must produce zero duplicates.

**`[MODIFY] SEED.md`** — document updated fields, login credentials, and instructions.

### 3.2 Global Doctor Data Hook

**`[NEW] src/hooks/useDoctors.ts`**
- Subscribes to `doctors` table via Supabase Realtime on mount
- Exposes `{ doctors, categories, getDoctorsByCategory, loading, error }`
- Cleans up subscription on unmount
- Used in: HomeScreen doctor grid, token generation flows, Admin doctor management, Doctor ProfilePanel availability toggle

---

## FEATURE 4 — TOKEN FORMAT ENGINE

### 4.1 Token Format Specification

```
Format:   {CATEGORY_CODE}-{DATE}-{SEQUENCE}
Example:  GN-22MAR-0001

GN        — 2-letter uppercase category code
22MAR     — date of token generation (DD + 3-letter uppercase month)
0001      — 4-digit zero-padded sequence, resets daily per category
```

**Category code mapping:**

| Category | Code | Token Example |
|---|---|---|
| General Physician | GN | GN-22MAR-0001 |
| ENT | EN | EN-22MAR-0001 |
| Pediatrics | PE | PE-22MAR-0001 |
| Orthopedics | OR | OR-22MAR-0001 |
| Dermatology | DE | DE-22MAR-0001 |

**Sequence behaviour:**
- Resets to `0001` every new calendar day, independently per category
- `GN-22MAR-0001` and `GN-23MAR-0001` are different tokens on different days
- Two patients in the same category on the same day get `GN-22MAR-0001` and `GN-22MAR-0002`

**Examples across days and categories:**
```
GN-22MAR-0001   ← 1st General patient, 22 March
GN-22MAR-0002   ← 2nd General patient, same day
EN-22MAR-0001   ← 1st ENT patient, 22 March (own counter)
GN-23MAR-0001   ← 1st General patient, 23 March (counter reset)
OR-01APR-0007   ← 7th Orthopedics patient, 1 April
```

---

### 4.2 Token Counter — Database Implementation

```sql
-- token_counters tracks per-category, per-date sequence
-- category_code is CHAR(2) to support 2-letter codes
CREATE TABLE IF NOT EXISTS token_counters (
  category_code CHAR(2)    NOT NULL,
  counter_date  DATE        NOT NULL,
  last_sequence INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (category_code, counter_date)
);

-- Seed initial rows for today — future dates auto-created by the RPC
INSERT INTO token_counters (category_code, counter_date, last_sequence)
VALUES
  ('GN', CURRENT_DATE, 0),
  ('EN', CURRENT_DATE, 0),
  ('PE', CURRENT_DATE, 0),
  ('OR', CURRENT_DATE, 0),
  ('DE', CURRENT_DATE, 0)
ON CONFLICT (category_code, counter_date) DO NOTHING;

-- Atomic token generation with daily reset
-- Uses INSERT ... ON CONFLICT to auto-create new date rows
CREATE OR REPLACE FUNCTION generate_token(
  p_category_code CHAR(2),
  p_date          DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT AS $$
DECLARE
  next_seq  INTEGER;
  date_str  TEXT;
BEGIN
  -- Upsert counter row for this category + date
  INSERT INTO token_counters (category_code, counter_date, last_sequence)
  VALUES (p_category_code, p_date, 1)
  ON CONFLICT (category_code, counter_date)
  DO UPDATE SET last_sequence = token_counters.last_sequence + 1
  RETURNING last_sequence INTO next_seq;

  -- Format date as DDMON e.g. 22MAR
  date_str := TO_CHAR(p_date, 'DDMON');

  -- Return token: GN-22MAR-0001
  RETURN p_category_code || '-' || date_str || '-' || LPAD(next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

**Critical:** Token generation must always use this RPC — never client-side. The `INSERT ... ON CONFLICT DO UPDATE` pattern is atomic and handles:
- Daily counter reset automatically (new date = new row starting at 1)
- Concurrent patients in the same category on the same day (no duplicates)
- No manual daily reset job needed — self-managing

---

### 4.3 Appointment Service — Token Integration

**`[MODIFY] appointmentService.ts`**
```typescript
export async function createAppointment(params: {
  patientId: string,
  doctorId: string,
  categoryCode: 'GN' | 'EN' | 'PE' | 'OR' | 'DE',
  reasonForVisit: string
}) {
  // Step 1: Generate token atomically via RPC (date defaults to server CURRENT_DATE)
  const { data: tokenStr, error: tokenError } = await supabase
    .rpc('generate_token', { p_category_code: params.categoryCode });
  if (tokenError) throw tokenError;

  // Step 2: Insert appointment record
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id:       params.patientId,
      doctor_id:        params.doctorId,
      token_number:     tokenStr,           // e.g. "GN-22MAR-0001"
      category_code:    params.categoryCode,
      reason_for_visit: params.reasonForVisit,
      status:           'waiting',
      generated_at:     new Date().toISOString()  // TIMESTAMPTZ, used for display
    });
  if (error) throw error;

  // Step 3: Increment global stats
  await incrementStat('tokens_today');

  return { data, tokenNumber: tokenStr };
}
```

**`[MODIFY] appointments table`**
```sql
-- Rename created_at to generated_at for semantic clarity, or add generated_at
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
```

**Date/time display helper — use this consistently across all screens:**
```typescript
// src/utils/formatTokenDate.ts
export function formatGeneratedAt(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',   // "Sunday"
    day: 'numeric',    // "22"
    month: 'long',     // "March"
    year: 'numeric'    // "2026"
  }) + ' at ' + date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  // Output: "Sunday, 22 March 2026 at 10:35 AM"
}

export function formatGeneratedAtCompact(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ' • ' + date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  // Output: "22 Mar 2026 • 10:35 AM"
}
```

---

### 4.4 Token Display Across All Screens

| Screen | Token Display | Date Display |
|---|---|---|
| Patient Dashboard — active token card | `GN-22MAR-0001` large, prominent | `Sunday, 22 March 2026 at 10:35 AM` |
| Doctor Dashboard — patient queue card | `GN-22MAR-0001` beside patient name | `22 Mar 2026 • 10:35 AM` (compact) |
| Admin Dashboard — appointment list | Full token string | Full date + time |
| Post-generation confirmation | *"Your Token: GN-22MAR-0001"* | Full date + time |
| ProfilePanel — Patient active token | `GN-22MAR-0001 • Dr. Aryan Mehta • Queue: 3rd` | Full date below |
| In-app notification banner | *"Token GN-22MAR-0001 — Your turn is next"* | — |

**Rule:** Always use `formatGeneratedAt()` or `formatGeneratedAtCompact()` from `src/utils/formatTokenDate.ts` — never inline date formatting in components.

---

## ARCHITECTURAL REQUIREMENTS

### Hard Rules
- **No hardcoded category lists** anywhere in the codebase — always fetch from `doctors` table
- **No client-side token number generation** — always use `generate_token` RPC
- **No email displayed to users** anywhere after this migration
- **Synthetic emails** are an implementation detail — never surface them in UI or user-facing error messages
- **No `any` TypeScript types** introduced by these changes
- **`category_code` is always CHAR(2)** (`GN`, `EN`, `PE`, `OR`, `DE`) — never use the old single-letter codes anywhere
- **Always use `formatTokenDate.ts` utilities** for date/time display — no inline date formatting in components

### Extensibility
- New doctor categories can be added by inserting a new doctor row with a new 2-letter `category_code` and a new `token_counters` seed row — zero code changes required
- `token_counters` daily reset is self-managing via the RPC — no cron job or manual reset needed
- `photoService.ts` must work generically for any entity — no hardcoded role names in storage paths
- All new services must be importable independently — no circular dependencies

### Migration Safety
- All schema changes in a single file: `migrations/002_v2_schema.sql`
- Every statement must be idempotent (`IF EXISTS`, `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Include rollback SQL at the bottom of the migration file as comments

---

## EXECUTION ORDER

1. Codebase audit — map all email usages, auth touchpoints, token creation points
2. Write `migrations/002_v2_schema.sql` — all schema changes, sequences, RPCs, token_counters (CHAR(2), composite PK)
3. Update seed script — 2-letter category codes, remove email, verify idempotency
4. Auth overhaul — ID generation, synthetic email, userService + authSlice + LoginScreen
5. Remove email from all forms, display components, and TypeScript types
6. Token format engine — generate_token RPC + appointmentService update + `formatTokenDate.ts` utility
7. Reason for visit — field in forms + display across screens
8. Profile photo system — Storage bucket + photoService + useProfilePhoto + UI
9. Doctor category picker — replace all hardcoded lists with getDoctorCategories(), ensure `category_code` is passed through
10. Admin post-registration token flow — modal + inline form
11. Token display audit — verify `GN-22MAR-0001` format and date strings appear correctly across all screens
12. `npx tsc --noEmit` — must pass clean, zero errors
13. End-to-end test — all 3 roles, full flow

---

## DELIVERABLES

- All modified and new source files including `src/utils/formatTokenDate.ts`
- `migrations/002_v2_schema.sql` — complete, idempotent, includes updated token_counters schema
- Updated `seedDoctors.ts` and `SEED.md` with 2-letter category codes
- Updated `CHANGES.md` — every file touched with reason
- `npx tsc --noEmit` clean confirmation
- End-to-end test confirmation: Patient login → token generation (`GN-22MAR-0001` format) → Doctor queue with date → Admin registration with token

---

*Autonomous execution. Do not pause for clarification on anything resolvable from the codebase or this spec. Flag only genuine blockers: missing credentials, missing native config, or direct contradictions in requirements.*
