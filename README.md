# LionSafari V1 — Prototype

A mobile/tablet/PC-friendly PWA prototype for Mama Lion operations.

Included in this prototype:
- Dashboard
- New Order
- Queue / Bay workflow
- Cash & QR payment logging
- Petty Cash
- Central Inventory / stock in-out / low stock
- Shift opening
- Restricted Music Control
- Local browser persistence via localStorage
- Cloud sync across devices (Firebase Firestore)
- Staff login with role-based tab access (Management / Cashier / Storekeeper)

Planned production modules:
- Reception, Washing Bay, Drying Bay, QC as separate roles (currently folded into Cashier/Storekeeper)
- Offline sync (works today via Firestore's built-in offline cache; needs testing under real shop WiFi drops)
- Branch separation (Mama Lion / Lion King)
- Customer/vehicle history and loyalty
- QC checklist and before/after photos
- Refund/void/discount approval + immutable audit trail
- Full inventory opening/closing handover, equipment incidents, purchase/receiving, supplier and costing
- Cost per car, branch/bay/shift/month/year analytics
- Receipt printing and QR integration
- CCTV/ANPR hooks and Mama Lion AI integration
- Prayer-time / quiet-time audio automation

## Run
Serve this folder using any static web server, e.g. `python -m http.server 8080`, then open the shown address in a browser. PWA installation requires HTTPS or localhost in supported browsers.
(Must be served over http(s), not opened as a `file://` path — `app.js` is now an ES module and browsers block modules from `file://`.)

## Cloud sync (multi-device, real-time)
By default the app runs local-only (same as before — data stays in one browser via localStorage).
To sync data live across every till/tablet/phone in the shop:
1. Create a free project at https://console.firebase.google.com
2. Build → Firestore Database → Create database (start in test mode for the demo)
3. Project settings → your web app → copy the config object
4. Paste those values into `firebase-config.js` (replace the `PASTE_...` placeholders)
5. Reload the app — the header will show "☁ Cloud sync aktif" once connected

Two branches (Mama Lion / Lion King) can be kept separate by giving each deployment a different `BRANCH_ID` in `firebase-config.js` — each ID gets its own document in Firestore.

## Staff login & roles (Firebase Authentication)

The app now requires login once cloud sync is enabled. Roles and what they can see:
- **Management** — every tab (full access)
- **Cashier** — Dashboard, New Order, Queue, Payment, Music
- **Storekeeper** — Dashboard, Inventory, Shift

### One-time setup (per staff member), done entirely in the Firebase Console
1. **Enable the sign-in method**: Build → Authentication → Sign-in method → enable **Email/Password**
2. **Create the login**: Authentication → Users → Add user → enter their email + a password (share it with them, they can't self-register)
3. **Assign their role**: Build → Firestore Database → Data → open (or create) the **`staff`** collection → Add document (auto-ID) with fields:
   - `email` (string) — same email as step 2, all lowercase
   - `name` (string) — display name, e.g. `Alam`
   - `role` (string) — exactly `Management`, `Cashier`, or `Storekeeper`
4. Repeat step 2–3 for every staff member.

Logging in checks the `staff` collection by email to find the role — no code changes needed to add more staff, just repeat the console steps above.

### Security rules (already tightened)
Firestore rules now require a logged-in account for any read/write, and the `staff` collection is read-only from the app (only editable by you in the console):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /branches/{branchId} {
      allow read, write: if request.auth != null;
    }
    match /staff/{staffId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```
Paste this into Firestore → Rules → Publish (replacing the `if true` demo rule).

Two branches (Mama Lion / Lion King) can be kept separate by giving each deployment a different `BRANCH_ID` in `firebase-config.js` — each ID gets its own document in Firestore.
