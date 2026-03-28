# Seed Data Documentation — v2.0

## Doctor Seed Accounts

All 5 doctors are created via the `seedDoctors()` function in `src/scripts/seedDoctors.ts`.

| Doctor | Specialty | Category Code | Login ID | Password |
|---|---|---|---|---|
| Dr. Aryan Mehta | General Physician | GN | DOC-000001 | Doctor@1234 |
| Dr. Kavita Rao | ENT | EN | DOC-000002 | Doctor@1234 |
| Dr. Anjali Bose | Pediatrics | PE | DOC-000003 | Doctor@1234 |
| Dr. Harish Reddy | Orthopedics | OR | DOC-000004 | Doctor@1234 |
| Dr. Nisha Agarwal | Dermatology | DE | DOC-000005 | Doctor@1234 |

## How Authentication Works

- **Login**: Users enter their Role ID (e.g., `DOC-000001`) + password
- **Internal mechanism**: A synthetic email (`doc-000001@opd.internal`) is constructed internally for Supabase Auth
- **No real email is required or displayed** — the synthetic email is purely an implementation detail

## Running the Seed Script

```bash
npx ts-node src/scripts/seedDoctors.ts
```

Or call `seedDoctors()` from the Admin Dashboard.

The script is **idempotent** — it checks for existing accounts by synthetic email before creating new ones.

## Admin Account

The admin must be created manually or via a separate seed:

| Field | Value |
|---|---|
| Login ID | ADM-000001 |
| Password | Admin@1234 |
| Synthetic Email | adm-000001@opd.internal |

## Token Format

Tokens use the format: `{CATEGORY_CODE}-{DATE}-{SEQUENCE}`

Examples:
- `GN-22MAR-0001` — First General Physician token on March 22
- `EN-22MAR-0003` — Third ENT token on March 22

Sequence resets daily per category via the `token_counters` table.
