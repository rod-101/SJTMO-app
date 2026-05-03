# SJTMO App — Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

---

## Step 1 — Create the Database

Open pgAdmin or psql and run:

```sql
CREATE DATABASE sjtmo_db;
```

Then connect to `sjtmo_db` and run the full schema:

```
psql -U postgres -d sjtmo_db -f database/schema.sql
```

Or paste the contents of `database/schema.sql` directly in pgAdmin's Query Tool.

---

## Step 2 — Configure Backend

Edit `backend/.env` if your PostgreSQL credentials differ:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sjtmo_db
DB_USER=postgres
DB_PASSWORD=postgres   ← change this if needed
PORT=5000
```

---

## Step 3 — Install Dependencies

Open two terminals:

**Terminal 1 — Backend**

```bash
cd backend
npm install
npm run dev
```

You should see:

```
SJTMO Backend running on http://localhost:5000
Connected to PostgreSQL database
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm start
```

Browser opens at `http://localhost:3000`

---

## Step 4 — Test Login

| Role     | Email             | Password |
| -------- | ----------------- | -------- |
| Admin    | admin@test.com    | 123456   |
| Enforcer | enforcer@test.com | 123456   |
| Motorist | motorist@test.com | 123456   |

---

## Troubleshooting

**"Cannot connect to database"**

- Check PostgreSQL is running
- Verify credentials in `backend/.env`

**"CORS error" in browser**

- Make sure backend is running on port 5000
- Check `frontend/.env` has `REACT_APP_API_URL=http://localhost:5000`

**Map not showing**

- Leaflet needs an internet connection for tile images
- Violations need latitude/longitude to appear as pins

---

## Quick Demo Flow

1. Log in as **Enforcer** → Issue a violation with GPS capture
2. Log in as **Admin** → See the new pin on the map in Live Map tab
3. Log in as **Motorist** → See the violation in their list, tap to view detail
4. Back as **Admin** → Resolve the violation in Violations tab
