# Seed Data — 5 Doctors

## Overview
The seed script creates **5 doctors** (one per category):

| Doctor Name       | Category           | Email                         | Password    |
|-------------------|--------------------|-------------------------------|-------------|
| Dr. Aryan Mehta   | General Physician  | aryan.mehta@medicare.com      | Doctor@123  |
| Dr. Kavita Rao    | ENT                | kavita.rao@medicare.com       | Doctor@123  |
| Dr. Anjali Bose   | Pediatrics         | anjali.bose@medicare.com      | Doctor@123  |
| Dr. Harish Reddy  | Orthopedics        | harish.reddy@medicare.com     | Doctor@123  |
| Dr. Nisha Agarwal | Dermatology        | nisha.agarwal@medicare.com    | Doctor@123  |

## How to Run

### Option 1 — From CLI
```bash
npx ts-node src/scripts/seedDoctors.ts
```

### Option 2 — From Admin Dashboard
The `seedDoctors()` function is exported and can be called from within the app (e.g., a "Seed Data" button on the Admin panel).

```typescript
import { seedDoctors } from '../scripts/seedDoctors';

const result = await seedDoctors();
// result = { created: 5, skipped: 0 }
```

## Idempotency
The script checks if a user with the given email already exists before creating. Running it multiple times will **not** create duplicate doctors.
