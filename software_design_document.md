# Software Design Document (SDD)
**System Name:** MediCare OPD Management System
**Version:** 2.1 | **Platform:** React Native | **Backend:** Supabase (PostgreSQL + Auth + Realtime)

---

## 2. SYSTEM OVERVIEW

### 2.1 General Description

The **MediCare OPD Management System** is a cross-platform mobile application that fully digitizes the Outpatient Department (OPD) workflow of a healthcare facility. Traditionally, OPD operations rely on paper tokens, manual queuing, and verbal communication — leading to inefficiencies, long wait times, and poor visibility into patient flow.

This system replaces those manual processes with a centralized, real-time digital platform accessible from Android and iOS. It provides three distinct user portals — **Admin**, **Doctor**, and **Patient** — each tailored to specific OPD roles.

### 2.2 Context and Background

The application addresses the following operational needs:

- Eliminate paper token issuance by generating structured, atomic, sequential digital tokens.
- Give doctors real-time visibility into their patient queues without polling or manual refresh.
- Give patients transparency into appointment status without physically waiting at a counter.
- Give administrators a live dashboard to monitor OPD statistics, doctor availability, and queue health.

The system connects to a cloud-hosted **Supabase** backend (PostgreSQL with Row-Level Security, Supabase Auth, and Realtime WebSocket channels). The mobile client communicates with this backend directly via the `@supabase/supabase-js` SDK — no intermediate custom application server is used.

### 2.3 Core Functionality Summary

| Feature | Description |
|---|---|
| Role-Based Authentication | Login via structured Role IDs (PAT-000001, DOC-000001, ADM-000001) + password. Synthetic internal email constructed from the Role ID for Supabase Auth compatibility. |
| Patient Registration | Admins register patients; unique sequential IDs generated atomically via server-side RPC. |
| Doctor Registration | Admins register doctors with specialty, category, and 2-letter category code. |
| Token Generation | Appointment tokens atomically generated via Supabase RPC (`generate_token`), producing formatted strings like `GN-03APR-0001`. |
| Appointment Lifecycle | Appointments transition: `WAITING → IN_PROGRESS → COMPLETED`. Doctors control transitions from their queue dashboard. |
| Real-Time Notifications | When a doctor calls a patient in, a notification is inserted to the DB and delivered via WebSocket channel. |
| Live Statistics Dashboard | Admin sees real-time counts: total patients, total doctors, tokens today, patients waiting, seen, and per-doctor queue lengths. |
| Notification Inbox | Doctors and patients have an in-app notification inbox with unread count badge in the header. |
| Token Renewal | Patients self-generate new appointment tokens by selecting a category and doctor. |

### 2.4 User Roles

| Role | Identifier | Key Capabilities |
|---|---|---|
| **Admin** | ADM-XXXXXX | Register patients & doctors, view OPD dashboard, search patient records |
| **Doctor** | DOC-XXXXXX | View patient queue, call patients in, mark consultations complete, receive notifications |
| **Patient** | PAT-XXXXXX | View own tokens, check appointment status, renew tokens, receive in-app notifications |

### 2.5 System Type

Mobile Application (React Native) connected to a Backend-as-a-Service (Supabase). Client architecture: **Presentation Layer → State Management Layer → Data Access Layer → Cloud Backend**.

---

## 3. SYSTEM ARCHITECTURE

### 3.1 Architectural Design

#### 3.1.1 Architecture Diagram

```
+------------------------------------------------------------------------+
|                       REACT NATIVE CLIENT                              |
|                                                                        |
|  +----------------+  +------------------+  +----------------------+   |
|  | Presentation   |  | State Management |  | Data Access Layer    |   |
|  | Layer          |<-| Layer            |<-| (Services)           |   |
|  | Screens,       |  | Redux authSlice  |  | userService.ts       |   |
|  | Navigators,    |  | Redux dbSlice    |  | appointmentService   |   |
|  | Components     |  | NotificationCtx  |  | NotificationService  |   |
|  +----------------+  +------------------+  | statsService         |   |
|                                            | doctorService        |   |
|                                            +----------+-----------+   |
+-------------------------------------------------------------+---------+
                                                             | HTTPS/WSS
                                                             v
+------------------------------------------------------------------------+
|                      SUPABASE CLOUD BACKEND                            |
|                                                                        |
|  +----------+  +------------------------+  +----------------------+   |
|  | Supabase |  | PostgreSQL Database    |  | Supabase Realtime    |   |
|  | Auth     |  | users, patients,       |  | WebSocket channels   |   |
|  | JWT+RLS  |  | doctors, admins,       |  | notifications,       |   |
|  +----------+  | appointments,          |  | appointments         |   |
|                | notifications          |  +----------------------+   |
|                +-----------+-----------+                              |
|                            |                                          |
|                +-----------+-----------+                              |
|                | RPC Functions         |                              |
|                | generate_token        |                              |
|                | generate_patient_id   |                              |
|                | generate_doctor_id    |                              |
|                | generate_admin_id     |                              |
|                +-----------------------+                              |
+------------------------------------------------------------------------+
```

**Diagram Description:** The React Native client is divided into three horizontal layers. The Presentation Layer (screens, navigators, shared components) consumes data from the State Management Layer (Redux store + NotificationContext). The Data Access Layer (service modules) bridges the client to Supabase via HTTPS REST calls and persistent WebSocket connections. Supabase provides all backend infrastructure: Auth (JWT + RLS), PostgreSQL persistence, server-side RPC stored procedures for atomic operations, and Realtime WebSocket channels for push-style event delivery.

#### 3.1.2 Subsystems and Responsibilities

| Subsystem | Responsibilities |
|---|---|
| **Presentation Layer** | Renders role-specific UI screens. Handles gestures and form inputs. Navigates between screens using React Navigation (stack + bottom-tab navigators). Displays live data received from State Management. |
| **State Management Layer** | Maintains global in-memory application state. Redux `authSlice` holds authentication credentials (consumed app-wide); Redux `dbSlice` holds legacy local data (persisted to AsyncStorage). `NotificationContext` manages real-time notification state and the Supabase subscription lifecycle. |
| **Data Access Layer** | Encapsulates all Supabase communication. Builds SQL/PostgREST queries, executes RPCs, maps raw JSON database rows into typed TypeScript interfaces, and manages Realtime channel subscriptions. |
| **Supabase Backend** | Handles identity management (Auth), relational data persistence (PostgreSQL), Row-Level Security policy enforcement, atomic token generation (RPC stored procedures), and WebSocket-based change broadcasting (Realtime). |

#### 3.1.3 Subsystem Collaboration Description

1. **App Startup Flow:** `App.tsx` fires `initDB()` (loads Redux `dbSlice` from AsyncStorage) and subscribes to `supabase.auth.onAuthStateChange`. On session detection → `getUserProfile()` (Data Access) → `store.dispatch(login())` (State Management) → `RootNavigator` re-renders with role-specific navigator (Presentation).

2. **Token Generation Flow:** Admin fills `RegisterPatientScreen` (Presentation) → `createAppointment()` in `appointmentService.ts` (Data Access) calls `generate_token` RPC on Supabase → inserts appointment row → returns typed `AppointmentData` to the screen.

3. **Realtime Queue Update:** `DoctorDashboard` subscribes to Supabase Realtime on `appointments` filtered by `doctor_id`. `INSERT` event → new patient card prepended to queue state. `UPDATE` event → status patched in-place. `COMPLETED` status → card removed. No full network re-fetch required.

4. **Notification Delivery:** Doctor taps "Call In" → `createNotification()` inserts row in `notifications` table → `NotificationContext` Realtime subscription receives `INSERT` event → `notifications` state updated → `AppHeader` badge increments → `InAppNotificationBanner` animates in globally.

---

### 3.2 Decomposition Description

#### 3.2.1 Module Map (Functional Decomposition)

```
MediCare OPD App
|
+-- Authentication Module
|   +-- HomeScreen              (public landing + live stats)
|   +-- LoginScreen             (Role ID + password form)
|   +-- AuthNavigator           (routing for unauthenticated users)
|   +-- userService.ts          loginWithRoleId(), registerUser(), getUserProfile()
|
+-- Navigation / Role Routing Module
|   +-- RootNavigator           (reads authSlice, selects child navigator)
|   +-- AdminNavigator          (tabs: Dashboard, Register Patient, Add Doctor, Search)
|   +-- DoctorNavigator         (tabs: Patient Queue, Search Patient)
|   +-- PatientNavigator        (tabs: My Tokens, Renew Token)
|
+-- Admin Module
|   +-- AdminDashboard          (live stats, today's appointments, queue, alerts)
|   +-- RegisterPatientScreen   (patient + appointment registration)
|   +-- DoctorRegistrationScreen(doctor registration)
|   +-- SearchPatientScreen     (patient lookup by ID)
|
+-- Doctor Module
|   +-- DoctorDashboard         (real-time FCFS queue + status controls)
|   +-- PatientSearchScreen     (search patient details)
|
+-- Patient Module
|   +-- PatientDashboard        (view tokens and live statuses)
|   +-- RenewTokenScreen        (self-service token generation)
|
+-- Notification Module
|   +-- NotificationContext     (global real-time notification state + subscription)
|   +-- NotificationService.ts  createNotification(), subscribeToNotifications(), markAsRead()
|   +-- NotificationScreen      (full notification inbox modal)
|   +-- InAppNotificationBanner (global overlay banner for latest unread)
|
+-- Shared Components
|   +-- AppHeader               (title + notification bell badge + profile avatar)
|   +-- ProfilePanel            (slide-in user profile drawer)
|
+-- State Management
|   +-- store/index.ts          (Redux store + AsyncStorage debounced persistence)
|   +-- authSlice.ts            (isAuthenticated, userId, role, userName, roleId, loading)
|   +-- dbSlice.ts              (users[], appointments[])
|
+-- Services (Data Access)
    +-- supabaseSetup.ts        (primary + secondary Supabase clients)
    +-- userService.ts          (user CRUD + auth helpers + role-conditional queries)
    +-- appointmentService.ts   (appointment CRUD + generate_token RPC)
    +-- NotificationService.ts  (insert + Realtime subscription + markAsRead)
    +-- doctorService.ts        (categories + availability with 5-min in-memory cache)
    +-- statsService.ts         (parallel aggregation count queries)
```

#### 3.2.2 Level 0 DFD — Context Diagram

```
                 +------------------------------+
  Admin  ------> |                              |
  Doctor ------> |   MediCare OPD System        | <-- Supabase Auth
  Patient -----> |                              | <-- Supabase PostgreSQL
                 |                              | <-- Supabase Realtime (WSS)
                 +------------------------------+
                              |
         +--------------------+--------------------+
         v                    v                     v
   Appointments          Notifications          Statistics
   (Token status)      (In-app alerts)        (Live counts)
```

#### 3.2.3 Level 1 DFD

```
                    +--------------------+
 Role ID+Password-->| 1. Authenticate    |--> JWT Session --> Redux authSlice
                    +--------+-----------+
                             | Authenticated Role
                             v
                    +--------------------+
                    | 2. Navigate        | RootNavigator selects branch
                    +--------+-----------+
                    +--------+--------+
                    v                 v
            +-----------+    +----------------+
            | 3. Register|   | 4. Manage      |
            |   Patient  |   |   Appointments |
            +------+-----+   +-------+--------+
                   |                 |
            +------v-----+   +-------v--------+
            | generate   |   | Supabase       |
            | token RPC  |   | Realtime (WSS) |
            +------+-----+   +-------+--------+
                   |                 |
            +------v-----------------v---------+
            | 5. Notify Patient (IN_PROGRESS)  |
            | INSERT notifications row         |
            | -> WebSocket -> NotificationCtx  |
            | -> AppHeader badge + Banner      |
            +----------------------------------+
```

#### 3.2.4 Sequence Diagram — Login Flow

```
User        LoginScreen     userService     supabase.auth    App.tsx
 |               |               |               |              |
 | ID + Pass     |               |               |              |
 |-------------->|               |               |              |
 |               | loginWithRoleId()             |              |
 |               |-------------->|               |              |
 |               |               | syntheticEmail|              |
 |               |               | signInWithPwd()|             |
 |               |               |-------------->|              |
 |               |               |  JWT session  |              |
 |               |               |<--------------|              |
 |               |               |        onAuthStateChange()  |
 |               |               |               |------------>|
 |               |               |               |  getUserProfile()
 |               |               |               |  dispatch(login)
 |               |               |               |  RootNavigator renders
```

#### 3.2.5 Sequence Diagram — Token Generation Flow

```
Admin   RegisterPatientScreen   appointmentService    supabase RPC
 |               |                     |                   |
 | Fill form     |                     |                   |
 |-------------->|                     |                   |
 |               | createAppointment() |                   |
 |               |-------------------->|                   |
 |               |                     | generate_token()  |
 |               |                     |------------------>|
 |               |                     | "GN-03APR-0001"   |
 |               |                     |<------------------|
 |               |                     | INSERT appointment|
 |               |  AppointmentData    |                   |
 |               |<--------------------|                   |
 | Show token    |                     |                   |
 |<--------------|                     |                   |
```

---

### 3.3 Design Rationale

#### 3.3.1 Why BaaS (Supabase) Instead of a Custom Server

**Decision:** Use Supabase as the complete backend rather than building a custom Node.js/Express server.

**Rationale:**
- Supabase provides auto-generated REST (PostgREST) endpoints, JWT-based auth, and Realtime WebSocket broadcasts out of the box — eliminating the need to design, code, and deploy a separate server layer.
- Supabase Realtime broadcasts PostgreSQL row-level changes over WebSocket channels, enabling live queue updates and notification delivery without custom pub/sub infrastructure.
- PostgreSQL Row-Level Security (RLS) policies enforce access control at the database layer, reducing data over-exposure risk for each role.
- The `generate_token` and `generate_*_id` stored procedures guarantee atomicity and sequential uniqueness — not reliably enforceable from client-side logic alone.

**Alternatives rejected:**
- **Custom Node.js server:** Would allow more complex business logic but requires infrastructure maintenance and longer development time — not justified for this project scope.
- **Firebase/Firestore:** Rejected due to its NoSQL document model, which is poorly suited to the relational OPD data model (users ↔ patients/doctors/appointments require joins and foreign key constraints).

#### 3.3.2 Dual State Strategy — Redux + NotificationContext

**Decision:** Maintain two concurrent state systems: Redux for auth/local DB, React Context for notifications.

**Rationale:**
- **Redux** suits `authSlice` (consumed across the entire app tree) and `dbSlice` (needs AsyncStorage persistence with a subscriber).
- **NotificationContext** is more appropriate for notification state because: (a) it only activates after login, (b) it directly wraps the Supabase Realtime subscription lifecycle, and (c) it avoids forcing Realtime WebSocket side-effects into Redux middleware/thunks.

**Trade-off:** Two state containers add cognitive overhead. Future consolidation using RTK Query or React Query is recommended.

#### 3.3.3 Synthetic Email Authentication

**Decision:** Construct `<roleId>@opd.internal` internally rather than asking users to manage an email address.

**Rationale:**
- Healthcare OPD staff and patients are not accustomed to email-based login; a structured, admin-issued Role ID is operationally more familiar.
- Supabase Auth requires an email field — the synthetic mapping satisfies this requirement internally without user exposure.

**Trade-off:** Non-standard authentication pattern. Creates rigidity if Supabase Auth API changes. Also complicates standard password-reset flows.

#### 3.3.4 Layered Modular Architecture

**Decision:** Separate screens, services, store, navigation, and context into distinct directory namespaces.

**Rationale:**
- Each layer has clear, single responsibilities: Services never render UI; Screens never build raw SQL; the Store never calls Supabase directly.
- The **Facade pattern** applied to service modules fully decouples screens from Supabase query-building details.
- The **Strategy pattern** in `RootNavigator` conditionally maps role values to navigator components, making it trivial to add new roles.
- The **Debouncing IO pattern** in `store/index.ts` limits expensive AsyncStorage disk writes to at most one write per 500 ms, preventing write storms during rapid state updates.

---

## 4. DATA DESIGN

### 4.1 Data Description

All persistent data is stored in a **Supabase-hosted PostgreSQL relational database**. The schema is anchored by a central `users` table which acts as the identity record for all role types. Role-specific extension tables (`patients`, `doctors`, `admins`) each hold a 1-to-1 relationship with `users`. Transactional data (`appointments`, `notifications`) references these entities via UUID foreign keys.

**Data Transformation Flow:**
1. User inputs raw form data (Presentation Layer).
2. Service layer maps inputs into a typed TypeScript interface and constructs a PostgREST call or RPC.
3. Data is stored in Supabase PostgreSQL.
4. On read: Supabase returns JSON rows which are mapped into TypeScript interfaces by the service layer and returned to the Presentation Layer.
5. For Realtime events: JSON change payload arrives via WebSocket and is merged into local React component state using smart patching (no full re-fetch).

**Local Persistence:**
- Redux `dbSlice` is serialized to JSON and written to `AsyncStorage` under key `@opd_db` using a debounced subscriber (500 ms delay).
- Supabase JWT session tokens are persisted in `AsyncStorage` by the SDK (`persistSession: true`), enabling session restoration on app restart without re-authentication.

### 4.2 Data Dictionary

#### Database Tables

| Table | Description |
|---|---|
| `users` | Central identity table. Every authenticated user has exactly one row. |
| `patients` | Role extension for patients. 1-to-1 FK → `users.id`. |
| `doctors` | Role extension for doctors. 1-to-1 FK → `users.id`. |
| `admins` | Role extension for admin personnel. 1-to-1 FK → `users.id`. |
| `appointments` | Transactional OPD visit token record, linking a patient to a doctor. |
| `notifications` | In-app alert records targeted to a specific user. |

#### `users`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Supabase Auth UID, links to `auth.users` |
| `name` | TEXT | Full name |
| `email` | TEXT | Synthetic internal email (`roleid@opd.internal`), never displayed |
| `role` | TEXT | One of `ADMIN`, `DOCTOR`, `PATIENT` |
| `phone` | TEXT | Optional |
| `age` | INTEGER | Optional |
| `dob` | DATE | Optional |
| `gender` | TEXT | Optional |
| `created_at` | TIMESTAMPTZ | Auto-set |

#### `patients`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK, FK → users.id) | Links to user record |
| `patient_id` | TEXT | Formatted role ID e.g. `PAT-000001`, sequential via RPC |
| `blood_group` | TEXT | Optional |
| `photo_url` | TEXT | Optional |

#### `doctors`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK, FK → users.id) | Links to user record |
| `doc_id` | TEXT | Formatted role ID e.g. `DOC-000001`, sequential via RPC |
| `speciality` | TEXT | e.g. `Cardiology` |
| `category` | TEXT | e.g. `General Physician` |
| `category_code` | CHAR(2) | 2-letter token prefix e.g. `GN`, `CR` |
| `department` | TEXT | Optional |
| `availability` | BOOLEAN | Whether doctor is currently accepting patients |
| `photo_url` | TEXT | Optional |

#### `admins`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK, FK → users.id) | Links to user record |
| `admin_id` | TEXT | Formatted role ID e.g. `ADM-000001` |
| `photo_url` | TEXT | Optional |

#### `appointments`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `patient_id` | UUID (FK → patients.id) | References the patient |
| `doctor_id` | UUID (FK → doctors.id) | References the assigned doctor |
| `token` | INTEGER | Legacy sequential integer (backward compat.) |
| `token_number` | TEXT | Formatted token e.g. `GN-03APR-0001` |
| `category_code` | CHAR(2) | Category code at time of generation |
| `reason` | TEXT | Short reason for visit |
| `reason_for_visit` | TEXT | Detailed reason for visit |
| `status` | TEXT | One of `WAITING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `visit_date` | DATE | Date of visit, used for daily token counting |
| `notes` | TEXT | Optional doctor notes |
| `generated_at` | TIMESTAMPTZ | When the token was generated |
| `created_at` | TIMESTAMPTZ | Auto-set |

#### `notifications`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → users.id) | Notification recipient |
| `title` | TEXT | Short title e.g. "Your turn is next" |
| `body` | TEXT | Full message body |
| `is_read` | BOOLEAN | Whether recipient has dismissed it |
| `created_at` | TIMESTAMPTZ | Auto-set |

#### TypeScript Interfaces (Application Layer)

| Interface | File | Key Attributes |
|---|---|---|
| `UserData` | `userService.ts` | id, name, role, roleId, phone?, specialty?, category?, categoryCode?, availability?, patientId?, bloodGroup?, photoUrl? |
| `AppointmentData` | `appointmentService.ts` | id?, patientId, doctorId?, token?, tokenNumber?, categoryCode?, reason, reasonForVisit?, status, visit_date?, generatedAt? |
| `Notification` | `NotificationService.ts` | id, user_id, title, body, is_read, created_at |
| `GlobalStats` | `statsService.ts` | totalDoctors, totalPatients, tokensToday, activeDoctors |
| `DoctorCategory` | `doctorService.ts` | category, categoryCode |
| `DoctorOption` | `doctorService.ts` | id, name, specialty, category, categoryCode, availability, docId, photoUrl? |
| `AuthState` | `authSlice.ts` | isAuthenticated, userId, role, userName, roleId, loading |

#### Redux Store State Shape

| Slice | Fields |
|---|---|
| `auth` | `isAuthenticated: bool`, `userId: string\|null`, `role: 'ADMIN'\|'DOCTOR'\|'PATIENT'\|null`, `userName: string\|null`, `roleId: string\|null`, `loading: bool` |
| `db` | `users: User[]`, `appointments: Appointment[]` |

---

## 5. COMPONENT DESIGN

### 5.1 `loginWithRoleId()` — `userService.ts`

**Purpose:** Authenticate a user using Role ID and password.

```
FUNCTION loginWithRoleId(roleId, password)
  BEGIN
    syntheticEmail <- CONCAT(LOWERCASE(roleId), "@opd.internal")
    CALL supabase.auth.signInWithPassword(email: syntheticEmail, password)
    IF error THEN THROW error
    // Success: Supabase sets JWT session
    // App.tsx onAuthStateChange fires -> getUserProfile() -> Redux dispatch(login())
  END
```

### 5.2 `registerUser()` — `userService.ts`

**Purpose:** Register a new ADMIN, DOCTOR, or PATIENT via a 4-step atomic process.

```
FUNCTION registerUser(role, password, data)
  BEGIN
    // Step 1: Generate unique Role ID via RPC
    rpcName <- CASE role
                 PATIENT -> 'generate_patient_id'
                 DOCTOR  -> 'generate_doctor_id'
                 ADMIN   -> 'generate_admin_id'
    generatedId <- CALL supabase.rpc(rpcName)
    IF NOT generatedId THEN THROW "Failed to generate role ID"

    // Step 2: Create Auth account via secondary client (preserves admin session)
    syntheticEmail <- CONCAT(LOWERCASE(generatedId), "@opd.internal")
    authUser <- CALL secondarySupabase.auth.signUp(email: syntheticEmail, password)
    uid <- authUser.id

    // Step 3: Insert base user profile
    INSERT INTO users {id: uid, name, email: syntheticEmail, role, phone, age, dob, gender}

    // Step 4: Update role-specific sub-table
    IF role = PATIENT: UPDATE patients SET patient_id=generatedId, blood_group=data.bloodGroup WHERE id=uid
    IF role = DOCTOR: UPDATE doctors SET doc_id=generatedId, speciality, category, category_code WHERE id=uid
    IF role = ADMIN: UPDATE admins SET admin_id=generatedId WHERE id=uid

    CALL secondarySupabase.auth.signOut()
    RETURN { user: UserData, generatedId }
  END
```

### 5.3 `getUserProfile()` — `userService.ts`

**Purpose:** Fetch the user profile using a two-step role-conditional query to avoid over-fetching irrelevant role tables.

```
FUNCTION getUserProfile(uid)
  BEGIN
    // Step 1: Lightweight fetch for role determination only
    baseData <- SELECT id, name, role, phone, age, dob, gender, created_at FROM users WHERE id=uid
    IF not found THEN RETURN null

    role <- baseData.role

    // Step 2: Role-conditional JOIN (only fetches the matching sub-table)
    selectString <- buildRoleSelect(role)
      // PATIENT -> base + patients(patient_id, blood_group, photo_url)
      // DOCTOR  -> base + doctors(doc_id, speciality, category, category_code, availability, ...)
      // ADMIN   -> base + admins(admin_id, photo_url)
    
    data <- SELECT selectString FROM users WHERE id=uid
    RETURN mapRowToUserData(data, role)
  END
```

### 5.4 `createAppointment()` — `appointmentService.ts`

**Purpose:** Atomically generate a formatted token and create an appointment transaction record.

```
FUNCTION createAppointment(patientId, doctorId, categoryCode, reason, reasonForVisit)
  BEGIN
    todayDate <- CURRENT_DATE as "YYYY-MM-DD"

    // Atomic token generation (sequential per category per day)
    tokenNumber <- CALL supabase.rpc('generate_token', {p_category_code: categoryCode})
    // Returns e.g., "GN-03APR-0001"
    IF NOT tokenNumber THEN THROW "Failed to generate token"

    // Extract legacy integer index from last 4 digits
    legacyToken <- PARSE last 4 chars of tokenNumber as INTEGER

    // Insert record
    inserted <- INSERT INTO appointments {
      patient_id, doctor_id, token: legacyToken, token_number: tokenNumber,
      category_code, reason, reason_for_visit, status: 'WAITING',
      visit_date: todayDate, generated_at: NOW()
    }
    RETURN mapAppointment(inserted)
  END
```

### 5.5 `fetchGlobalStats()` — `statsService.ts`

**Purpose:** Fetch four OPD statistics in parallel to minimize latency on dashboards.

```
FUNCTION fetchGlobalStats()
  BEGIN
    todayDate <- CURRENT_DATE as "YYYY-MM-DD"

    PARALLEL AWAIT:
      patRes    <- COUNT FROM users WHERE role='PATIENT'
      docRes    <- COUNT FROM users WHERE role='DOCTOR'
      tokenRes  <- COUNT FROM appointments WHERE visit_date=todayDate
      activeRes <- COUNT FROM doctors WHERE availability=true

    RETURN {
      totalPatients: patRes.count,
      totalDoctors: docRes.count,
      tokensToday: tokenRes.count,
      activeDoctors: activeRes.count
    }
  END
```

### 5.6 `subscribeToNotifications()` — `NotificationService.ts`

**Purpose:** Open a Supabase Realtime WebSocket channel to deliver targeted push notifications.

```
FUNCTION subscribeToNotifications(userId, onNewNotification)
  BEGIN
    channel <- supabase
      .channel('notifications:' + userId)
      .on('postgres_changes', {
          event: 'INSERT', schema: 'public',
          table: 'notifications', filter: 'user_id=eq.' + userId
        },
        CALLBACK: onNewNotification(payload.new)
      )
      .subscribe()

    RETURN channel // Caller responsible for supabase.removeChannel(channel)
  END
```

### 5.7 `AdminDashboard.fetchStats()` — `AdminDashboard.tsx`

**Purpose:** Fetch all admin dashboard context data in a single parallel batch with a 15-second TTL cache for seamless back-navigation.

```
FUNCTION fetchStats(forceRefresh=false)
  LOCAL: lastFetchedAt (ref), CACHE_TTL = 15000 ms

  BEGIN
    IF (NOW - lastFetchedAt) < CACHE_TTL AND NOT forceRefresh THEN
      RETURN // Use existing cached UI state

    todayDate <- TODAY as "YYYY-MM-DD"

    // 7 queries in one parallel batch
    PARALLEL AWAIT:
      1. SELECT name FROM users WHERE id = currentUserId
      2. COUNT FROM users WHERE role = 'PATIENT'
      3. COUNT FROM users WHERE role = 'DOCTOR'
      4. COUNT FROM appointments WHERE visit_date = todayDate
      5. SELECT id, token_number, status, patients, doctors FROM appointments WHERE visit_date = todayDate
      6. SELECT id, doc_id, users.name FROM doctors
      7. SELECT id, status, patients, created_at FROM appointments ORDER BY created_at DESC LIMIT 5

    SET adminName, totalPatients, totalDoctors, todayTokens
    DERIVE patientsWaiting = COUNT(status = 'WAITING')
    DERIVE patientsSeenToday = COUNT(status = 'COMPLETED')
    DERIVE avgWaitTime = patientsWaiting * 8 // 8 mins estimated per wait
    DERIVE queueStatus = GROUP BY doctorId -> COUNT(WAITING)
    DERIVE recentActivity = last 5 events

    lastFetchedAt <- NOW
  END
```

### 5.8 `DoctorDashboard` — Realtime Smart State Patch

**Purpose:** Apply in-place state patches to the live queue upon Realtime events, instead of triggering full database re-fetches.

```
ON REALTIME EVENT (eventType, newRow, oldRow):

  IF eventType = 'INSERT' THEN
    IF patient name is available in pushed payload THEN
      PREPEND newRow to queue state
    ELSE
      CALL fetchQueue() // targeted re-fetch to ensure joined associations load

  ELSE IF eventType = 'UPDATE' THEN
    IF newRow.status = 'COMPLETED' THEN
      REMOVE item where id = newRow.id from queue state
    ELSE
      PATCH item where id = newRow.id: update status field in-place

  ELSE IF eventType = 'DELETE' THEN
    REMOVE item where id = oldRow.id from queue state
```

### 5.9 `RootNavigator` — Role-Based Routing

**Purpose:** Render the appropriate navigation stack based on Redux state.

```
FUNCTION RootNavigator()
  BEGIN
    {isAuthenticated, role} <- READ from Redux authSlice

    IF NOT isAuthenticated THEN
      Navigator <- AuthNavigator // Login / Home

    ELSE IF role = 'ADMIN' THEN
      Navigator <- AdminNavigator
      
    ELSE IF role = 'DOCTOR' THEN
      Navigator <- DoctorNavigator
      
    ELSE IF role = 'PATIENT' THEN
      Navigator <- PatientNavigator

    RENDER: NavigationContainer > Navigator
  END
```

---

## 6. HUMAN INTERFACE DESIGN

### 6.1 Overview of User Interface

The application utilizes a multi-portal interface tailored specifically to the authenticated Role (`ADMIN`, `DOCTOR`, `PATIENT`) alongside a public unauthenticated `HomeScreen`.

All screens employ the following shared conventions:
- **Material Design 3 Components:** Utilizes `react-native-paper` for Cards, TextInputs, Snackbars, and Buttons.
- **Top AppHeader:** Consistent branding, screen title, Profile avatar (for slide-out settings), and conditionally rendered Notification Bell badge.
- **Bottom Tab Navigator:** Icon-based routing controls at the bottom of the viewport for primary sections.
- **Pull-To-Refresh:** Included on all dashboard queue lists to guarantee synchronization if Realtime disconnects.

### 6.2 Screen Layout Descriptions

#### Screen 1: HomeScreen (Public)
**Purpose:** Public-facing landing page showing live general OPD metrics.
- **Hero Banner:** "Welcome to OPD System — Your centralized digital healthcare solution."
- **Live Stats Grid:** Four numerical cards showing `Total Doctors`, `Total Patients`, `Tokens Today`, and `Active Doctors`.
- **Available Doctors List:** Horizontal scrolling carousel showing Doctor cards (Name, Specialty, Availability Badge).
- **Navigation:** Buttons to navigate to role selection, which triggers the `LoginScreen`.

#### Screen 2: LoginScreen
**Purpose:** Shared authentication gateway.
- **Input Fields:** Single `Role ID` input (e.g., `PAT-000001`) and a hidden password input.
- **Validation:** The Role ID field strictly enforces uppercase prefix formats before enabling submission.
- **Feedback:** SnackBar to display missing credentials or wrong password errors.

#### Screen 3: Admin Dashboard
**Purpose:** Holistic view for administrative operations.
- **Overview Cards:** High-level counts of registered users and today's generated tokens.
- **Live Queue Table:** A vertical list displaying all tokens generated today across all doctors.
- **Queue Health Bar:** Visual progress bars indicating which doctor's queue is congested.
- **Recent Activity:** Short timestamped logs of tokens created or status changes.
- **Alert Card:** Conditionally displayed warnings (e.g., *High Wait Time: 40 mins*).
- **Quick Actions:** Prominent floating-style buttons for executing "Register Patient" or "Search".

#### Screen 4: Register Patient Screen (Admin)
**Purpose:** Form implementation to register patients and emit `IN_PROGRESS` appointments.
- **Demographics Group:** Text inputs for Name, Phone, Age, DOB, and Blood Group.
- **Appointment Group:** Cascading dropdown pickers — Selecting `Category` dynamically alters the available choices in the `Doctor` picker. 
- **Submission:** Submits atomic multi-table commit and displays an overlay dialog with the newly generated `PAT-XXXXXX` and `GN-XXXXX-XXXX` token format.

#### Screen 5: Doctor Dashboard
**Purpose:** Daily workbench for the doctor role.
- **Waiting Count:** A clear indicator of the number of unchecked patients.
- **Patient Queue List:** Cards displaying patient name, token number, reason for visit, and registration timestamp.
- **Action Controls:** Each row has a `Call In` button (transitions status to `IN_PROGRESS` and notifies the patient) and a `Mark Done` button (transitions status to `COMPLETED` and dequeues the item).

#### Screen 6: Patient Dashboard (My Tokens)
**Purpose:** Enables patients to monitor their appointment statuses dynamically.
- **Token Cards:** Visually dominant cards displaying the `Token Number`.
- **Status Indicator:** Color-coded pill badge indicating `WAITING` (amber), `IN_PROGRESS` (blue), or `COMPLETED` (green). Status patches in real-time.

### 6.3 Screen Objects and Actions

| Screen | Object | User Action | System Response |
|---|---|---|---|
| `HomeScreen` | Pull-to-refresh Gesture | Swipe Down | Re-fetches aggregate public statistics from `statsService`. |
| `LoginScreen` | Login Button | Tap | Validates input format, executes `loginWithRoleId()`, retrieves JWT. |
| `AdminDashboard` | View Queue Button | Tap | Navigates to `SearchPatientScreen` with focus applied to the search box. |
| `DoctorDashboard` | Call In Button | Tap | Calls `handleUpdateStatus('IN_PROGRESS')`. Fires Realtime `UPDATE`. Sends `notifications` INSERT for the `patient_id`. |
| `DoctorDashboard` | Mark Done Button | Tap | Calls `handleUpdateStatus('COMPLETED')`. Removes card from immediate View. |
| `PatientDashboard` | Notification Bell | Tap | Toggles visibility of `NotificationScreen` modal to show inbox. |
| `Global` | Unread Banner Overlay | Tap | Navigates to notification context, executing `markAsRead()` on target row. |

---

## 7. REQUIREMENTS MATRIX

Matches the system components and defined interfaces to functional requirements (FR).

| Req. ID | Functional Requirement | Satisfied By (Components/Functions) | Data Structures |
|---|---|---|---|
| FR-01 | Support Admin, Doctor, and Patient login. | `LoginScreen`, `loginWithRoleId()` | `users.email` (synthetic), `AuthState` |
| FR-02 | Validate Role ID strict formatting (`PAT-/DOC-/ADM-`). | `LoginScreen` (regex: `/^(PAT\|DOC\|ADM)-\d{6}$/i`) | `AuthState.roleId` |
| FR-03 | Enforce correct Role UI on authentication. | `RootNavigator` role conditionals | `AuthState.role` |
| FR-04 | Admin capability to register patients. | `RegisterPatientScreen`, `registerUser('PATIENT')` | `patients` table, `UserData` |
| FR-05 | Auto-generate sequential logic for patient IDs. | `registerUser()` -> `generate_patient_id` RPC | `patients.patient_id` |
| FR-06 | Admin capability to register doctors. | `DoctorRegistrationScreen`, `registerUser('DOCTOR')` | `doctors` table, `UserData` |
| FR-07 | Auto-generate sequential logic for doctor IDs. | `registerUser()` -> `generate_doctor_id` RPC | `doctors.doc_id` |
| FR-08 | Atomically generate unique formatted tokens. | `createAppointment()` -> `generate_token` RPC | `appointments.token_number` |
| FR-09 | Persist full appointment payload context. | `createAppointment()`, `appointments` table | `AppointmentData` |
| FR-10 | Support Queue Status phase transitions. | `DoctorDashboard` Action handlers, `appointmentService` | `appointments.status` |
| FR-11 | Real-time queue sync for assigned appointments. | `DoctorDashboard` Realtime Hook and state-patching | `appointments` table |
| FR-12 | Doctor tools to Call In / Mark Done. | `DoctorDashboard` Action Buttons | `appointments.status` |
| FR-13 | Trigger notification to patient during transition. | `DoctorDashboard.handleUpdateStatus()` -> `createNotification()` | `notifications` table |
| FR-14 | Real-time delivery constraint for Notifications. | `NotificationContext.subscribeToNotifications()` | Supabase Realtime WSS Channel |
| FR-15 | Visual notification badge for unread counts. | `AppHeader` Notification Bell badge | `NotificationContext.unreadCount` |
| FR-16 | End-state view capability for owned Tokens. | `PatientDashboard` and `getPatientAppointments()` | `AppointmentData` |
| FR-17 | Permitted auto-renewal capability for Patients. | `RenewTokenScreen`, `createAppointment()` | `AppointmentData` |
| FR-18 | Generate aggregate administration insights. | `AdminDashboard.fetchStats()`, `fetchGlobalStats()` | `GlobalStats` |
| FR-19 | Display aggregated doctor loads and wait limits. | `AdminDashboard` components | `doctors.availability`, `appointments.status` |
| FR-20 | Expose non-sensitive public analytics counts. | `HomeScreen`, `fetchGlobalStats()` | `GlobalStats` |
| FR-21 | Provide universal patient search parameter tools. | `SearchPatientScreen` (Text query) | `UserData`, `patients.patient_id` |
| FR-22 | Sub-query visibility of patient for doctors. | `PatientSearchScreen` (Doctor context limit) | `UserData` |
| FR-23 | Guarantee session lifecycle per-device persistence. | `supabaseSetup.ts` (`persistSession: true`) | `AsyncStorage` |
| FR-24 | Operational threshold warnings for administrators. | `AdminDashboard` Contextual Alert components | `appointments.status`, `doctors.availability` |
| FR-25 | Inbox visualization and lifecycle control. | `NotificationScreen`, `markAsRead()` | `Notification` interface |

---

*End of Software Design Document*
*MediCare OPD Management System v2.1 — Based on architectural analysis of the current React Native and Supabase infrastructure.*
