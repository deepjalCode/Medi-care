# CHANGES.md — OPD App v2.0 Upgrade

## Summary
This upgrade migrates the app from a dual data model (Redux local `dbSlice` + Supabase) to a **fully Supabase-powered architecture** with real-time subscriptions, in-app notifications, a consistent global header, and role-aware profile panels.

---

## New Files

| File | Purpose |
|------|---------|
| `src/services/statsService.ts` | Global stats fetching + Supabase Realtime subscription |
| `src/services/NotificationService.ts` | CRUD for `notifications` table + Realtime listener |
| `src/hooks/useGlobalStats.ts` | Hook for live global stats (doctors, patients, tokens) |
| `src/hooks/useNotifications.ts` | Hook for in-app notification state management |
| `src/components/AppHeader.tsx` | Reusable header (logo + title + profile button) |
| `src/components/ProfilePanel.tsx` | Role-aware profile modal (Patient/Doctor/Admin) |
| `src/components/InAppNotificationBanner.tsx` | Slide-down toast for new notifications |
| `src/scripts/seedDoctors.ts` | Idempotent seed script for 5 doctors |
| `src/scripts/create_notifications_table.sql` | SQL migration for `notifications` table |
| `SEED.md` | Documentation for running the seed script |

## Modified Files

| File | Changes |
|------|---------|
| `App.tsx` | Added `InAppNotificationBanner` at root; created `AppInner` for hook context |
| `src/screens/doctor/DoctorDashboard.tsx` | Full rewrite: Redux → Supabase Realtime FCFS queue + notification trigger |
| `src/screens/patient/PatientDashboard.tsx` | Full rewrite: Redux → Supabase Realtime token list |
| `src/screens/patient/RenewTokenScreen.tsx` | Full rewrite: 5 doctor categories + Supabase + notification trigger |
| `src/screens/doctor/PatientSearchScreen.tsx` | Migrated from Redux to Supabase `getAllUsersByRole` |
| `src/screens/auth/HomeScreen.tsx` | Removed bell icon; added live stats + doctor grid |
| `src/navigation/AdminNavigator.tsx` | Integrated `AppHeader` + `ProfilePanel` |
| `src/navigation/DoctorNavigator.tsx` | Integrated `AppHeader` + `ProfilePanel` |
| `src/navigation/PatientNavigator.tsx` | Integrated `AppHeader` + `ProfilePanel` |

## Supabase Requirements

1. **Run `create_notifications_table.sql`** in the Supabase SQL Editor to create the `notifications` table with RLS
2. **Enable Realtime** on `users`, `appointments`, and `notifications` tables (the SQL does this for `notifications`)
3. Optionally run the `seedDoctors()` function to seed 5 doctors
