OPD App
Version: 1.0
Target: Senior Full-Stack Developer Agent (React Native + Supabase)
Scope: Feature Upgrade, Architectural Extension, UI Overhaul

ROLE & MINDSET
You are a Senior Full-Stack Developer with deep expertise in React Native,Supabase, and production-grade mobile app architecture. Before writing a single line of code:

Read and map the entire existing codebase and App analysis.md file — understand every screen, navigator, role, data model, service layer, and component.
Identify existing patterns (navigation structure, auth flow, component naming, state management approach) and strictly follow them unless the upgrade explicitly requires change.
Do not break existing functionality. Every modification must be backward-compatible with current features.
Plan before implementing: For each feature, state what existing code you are modifying, what you are adding, and why.
The app must remain extensible — use modular, well-separated service files, hooks, and components so future features can be added without restructuring core logic.


SYSTEM CONTEXT
This is an OPD (Outpatient Department) Management App with three user roles:

Admin — manages doctors, patients, global data
Doctor — views assigned patient queue, manages consultations
Patient — registers, selects a doctor, generates a token, waits for turn

The app uses role-based navigation and a shared Firebase/Supabase backend.

FEATURE SPECIFICATIONS
FEATURE 1 — Real-Time Notifications
1.1 Patient Notification

When a patient's token is called (i.e., it becomes their turn in the queue), send a real-time push notification to the patient's device.
Notification content: "Your turn is next. Please proceed to Dr. [Name]'s room."
Use Supabase or equivalent push service.
Store the FCM token on patient registration/login and associate it with the patient document.

1.2 Doctor Notification

When a patient generates a token specifically assigned to a doctor, that doctor must receive an immediate real-time push notification.
Notification content: "New patient [Name] has been added to your queue. Token #[number]."
Store each doctor's FCM token on their login and associate it with their doctor document.

1.3 Notification Badge — Homepage Cleanup

Remove any persistent notification UI elements (banners, badges, icons) currently displayed on the app's landing/home page.
Notifications should only appear as native OS push notifications and, if needed, a dedicated notification screen — not embedded in the homepage layout.
Audit all homepage components and strip notification-related UI nodes.

Implementation Note: Use a NotificationService.js (or .ts) module that abstracts FCM registration, token storage, and trigger functions. All three roles call this service — do not hardcode notification logic inside screens.

FEATURE 2 — Functional Logic Upgrades
2.1 Doctor Dashboard — Patient Queue View
After a patient generates a token routed to a specific doctor:

The Doctor Dashboard must display a live, real-time list of patients assigned to them.
Patients must be listed in First-Come, First-Served (FCFS) order — sorted strictly by tokenGeneratedAt timestamp (ascending).
Each patient card must show: Token Number, Patient Name, Time of Registration.
The list must update in real-time (use Firestore onSnapshot listener or Supabase Realtime subscription — whichever the existing backend uses).
Do not use one-time fetch calls (get()) for this view. It must be a live listener.

2.2 Global Statistics — Single Source of Truth
The following three counts must be globally consistent across all screens and roles:

Total Patients Registered
Total Doctors Available
Total Tokens Generated

Implementation rules:

These values must be derived from a single shared supabase collection  Supabase table — not computed independently per screen.
Use a global stats document (e.g., stats/global in relevant) that is updated via atomic increments whenever a patient registers, a doctor is added, or a token is generated.
Any screen displaying these counts must subscribe to this same document. No local state approximations.

2.3 Patient Self-Renew Token — Doctor Category Fix
The patient token generation flow must allow selecting from exactly 5 dummy doctor categories:
#Category1General Physician2ENT (Ear, Nose, Throat)3Pediatrics4Orthopedics5Dermatology
Seed Data Requirement — 5 Doctors per Category (25 total):
Add the following doctors to the database. Use a seed script or admin-triggered function:
Doctor NameCategoryDr. Aryan MehtaGeneral PhysicianDr. Kavita RaoENTDr. Anjali BosePediatricsDr. Harish ReddyOrthopedicsDr. Nisha AgarwalDermatology
These doctors must appear in both the doctor list and the category-filtered token generation flow.

FEATURE 3 — Design & UI Upgrades
3.1 Homepage — Live Statistics Section
Add a statistics dashboard section to the Home/Landing Page, sourced directly from the global stats document (see Feature 2.2):
Required stat cards (minimum):

🧑‍⚕️ Total Doctors — count from doctors collection
🧑 Total Patients — count from patients collection
🎫 Tokens Generated Today — count from tokens where date == today
🏥 Active Doctors — count of doctors with availability == true

Additionally, show a scrollable list or grid of all doctors on the homepage with:

Doctor Name
Specialty/Category
Availability status (green = available, red = unavailable)

All data must be live-subscribed (real-time), not static or fetched once.
3.2 Global Top Header Bar
Add a consistent top header/app bar component across ALL screens in the app — for all three roles (Patient, Doctor, Admin).
The header must include:

App name / Logo (left-aligned)
Current screen title (center, dynamic per screen)
Profile button (right-aligned — see Feature 3.3)

Create this as a single reusable AppHeader component and integrate it into every screen via the navigation layout or a shared wrapper. Do not copy-paste the header into individual screens.
3.3 Profile Button — Role-Aware Info Panel
The profile button (top-right of the header) must open a profile panel/modal/drawer that displays context-sensitive information based on the logged-in role:
Patient Profile Panel:

Full Name
Phone / Email
Total Tokens Generated
Current Active Token (if any) with assigned doctor and queue position

Doctor Profile Panel:

Full Name
Specialty/Category
Current Queue Size (live count of patients assigned today)
Availability Toggle (active/inactive — updates Firestore in real time)

Admin Profile Panel:

Admin Name
Total Doctors (live)
Total Patients (live)
Total Tokens Today (live)
Quick links: "Add Doctor", "View All Patients"

The profile panel must fetch data from the database — not hardcoded. It must reflect real-time values.

ARCHITECTURAL REQUIREMENTS
Extensibility

All new features must be implemented as independent, composable modules (services, hooks, components).
No feature logic should be hardcoded inside navigation files or screen components directly.
Follow a separation of concerns: UI layer, service layer (API/DB calls), and state layer must be distinct.
Add comments marking extension points: // EXTEND: Add [feature name] here

Error Handling

Every async operation must have explicit error handling with user-visible feedback (toast, alert, or inline error message).
Firestore/Supabase listener teardowns must be handled in useEffect cleanup functions to prevent memory leaks.

Code Quality Standards

Use consistent naming conventions matching the existing codebase.
No dead code, no commented-out blocks left in production files.
Every new component must be placed in the appropriate existing folder structure.
If a seed script is written, it must be idempotent (safe to run multiple times without creating duplicates).


EXECUTION ORDER (Recommended)

Codebase audit — map all screens, services, navigators, data models
Implement global stats document and atomic increment logic (Feature 2.2)
Seed the 25 doctors into the database (Feature 2.3 seed data)
Fix token generation — category selector with 5 categories (Feature 2.3 UI)
Build NotificationService and integrate FCM (Feature 1.1, 1.2)
Strip homepage notification UI (Feature 1.3)
Build Doctor Dashboard real-time queue (Feature 2.1)
Build AppHeader component and integrate everywhere (Feature 3.2)
Build Profile Panel — role-aware (Feature 3.3)
Build Homepage statistics section (Feature 3.1)
Full integration test across all three roles
Final code cleanup, comment extension points


DELIVERABLES

Modified source code with all features implemented
A SEED.md or inline seed script for the 5 doctors
A CHANGES.md listing every file modified and why
Confirmation that all three roles (Patient, Doctor, Admin) have been tested end-to-end with the new features active