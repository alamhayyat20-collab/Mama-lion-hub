# Mama Lion hub — Prototype

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

Planned production modules:
- Role-based access: Management, Cashier, Reception, Washing Bay, Drying Bay, QC, Storekeeper
- Real database + cloud sync + offline sync
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

Before going live with real staff, tighten the Firestore security rules (test mode is open to anyone with the project config) and add Firebase Authentication for role-based login.
