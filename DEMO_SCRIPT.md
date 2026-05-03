# SJTMO App — Demo Script

## Presentation Flow (10-15 minutes)

---

### SCENE 1: Introduction (1 min)

> "This is the San Jose Traffic Management Office System — a unified PWA supporting three roles: Admin, Enforcer, and Motorist."

Open browser to `http://localhost:3000`

---

### SCENE 2: Login + Role-Based Routing (1 min)

1. Show the login page
2. Click the **"Enforcer"** quick-fill button → Sign In
3. System automatically redirects to `/enforcer`

> "One login page. The system reads the role from the database and routes accordingly."

---

### SCENE 3: Enforcer Issues a Violation (2 min)

You are now on the Enforcer Panel:

1. In "Issue Violation" tab:
   - Type motorist name: `Pedro Motorist`
   - Select: `No Helmet`
   - Notes: `No helmet on main highway`
   - Click **📍 Capture GPS Location** → shows coordinates
   - Click **🚨 Issue Violation**

2. Success screen appears → redirects to "My Issued" tab
3. Show the card for the new violation

> "Enforcer captures the violation with GPS coordinates in real-time."

---

### SCENE 4: Admin Sees It Live (3 min)

1. Open new tab or incognito → `http://localhost:3000`
2. Log in as **Admin**
3. Go to **Overview** tab:
   - Total violations updated
   - Today's count incremented
   - Breakdown bar chart shows "No Helmet"

4. Click **🗺️ Live Map** tab:
   - Map of San Jose/Philippines area
   - **Green pin** for "No Helmet" appears
   - Click the pin → popup shows: motorist name, type, date

5. Click **📋 Violations** tab:
   - Table shows the new violation
   - Status: **Pending** (orange badge)
   - Click ✓ to **Resolve** it → badge turns green

> "Admin sees real-time data — updated stats, colored map pins, full violation table."

---

### SCENE 5: Motorist Views Their Record (2 min)

1. Open new tab → `http://localhost:3000`
2. Log in as **Motorist** (motorist@test.com)
3. Dashboard shows violation cards
4. **Tap any violation** → Detail modal opens:
   - Violation type, date, enforcer
   - Status badge
   - Mini map showing exactly where it was issued

> "Motorist can view all their violations with location on a map."

---

### SCENE 6: Admin User Management (1 min)

1. Back as Admin → **👥 Users** tab
2. Click **+ Add User**
3. Fill: Name, Email, Password, Role = Enforcer
4. Create → appears in table immediately

---

### SCENE 7: Wrap Up (1 min)

> "The system demonstrates:
>
> - Role-based access control
> - Real-time violation tracking
> - Interactive map with color-coded pins
> - Mobile-first interface for field enforcers
> - Full CRUD for violations and users"

---

## Features Checklist

### Must-Have (All Working ✅)

- [x] Login with role detection
- [x] Role-based routing (admin/enforcer/motorist)
- [x] Issue violation (enforcer)
- [x] GPS capture (real or mocked)
- [x] View all violations (admin table)
- [x] Violations on Leaflet map
- [x] Color-coded map pins
- [x] Motorist violation history
- [x] Violation detail modal with mini-map
- [x] Status update (pending → resolved → dismissed)
- [x] User management CRUD
- [x] Auto-refresh every 15 seconds (admin)

### Nice-to-Have (Simplified ✅)

- [x] Violation breakdown chart (CSS bars)
- [x] Demo quick-login buttons
- [x] Responsive mobile layout
- [x] Empty states with icons

### Intentionally Omitted (Out of Scope)

- JWT auth tokens (plain DB lookup is fine for demo)
- File/photo attachments
- Push notifications
- Offline mode

---

## Color Coding Reference

| Violation Type    | Pin Color |
| ----------------- | --------- |
| No Helmet         | 🟢 Green  |
| Illegal Parking   | 🔵 Blue   |
| No License        | 🔴 Red    |
| Reckless Driving  | 🟠 Orange |
| Beating Red Light | 🟡 Yellow |
| Obstruction       | 🟣 Violet |
| Other             | ⚫ Gray   |
