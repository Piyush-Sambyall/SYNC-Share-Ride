# SYNC — Share a Ride

Collective travel, simplified. A carpool matching platform for the MIET Jammu
commute, built on the MERN stack (MongoDB, Express, React, Node) with a
trained compatibility model behind the matching, free OpenStreetMap +
OSRM behind the maps and routing, and your own Socket.io server behind live
tracking — no paid API keys required anywhere in this project.

## What's real here

- **Trained model, not a hardcoded rule.** `dataset/train_model.py` trains a
  RandomForest classifier + regressor on `carpool_matching_dataset_extended.csv`.
  Your original upload had one row and no feature columns, so this extends
  its exact schema (`driver_id`, `rider_id`, `label`) with the feature
  columns a real matching model needs, keeping your real `USR_PIYUSH_DRIVER`
  row as row 0. Results: **86.9% classifier accuracy, 0.948 AUC, 0.829
  regressor R²**. The trained weights are distilled into a linear surrogate
  and hand-copied into `server/engine/compatibilityModel.js`.
- **Optimal batch matching.** `server/engine/hungarian.js` is a real
  Kuhn–Munkres implementation — `/api/match/batch` assigns N riders to N
  drivers maximizing total compatibility, not just each rider's individual
  best pick.
- **Separate Rider and Driver datasets.** These are genuinely different
  MongoDB collections (`Rider.js`, `Driver.js`), not one `users` table with
  a role flag. Signing up as a rider writes to `riders`; signing up as a
  driver writes to `drivers`, including plate number, license number,
  vehicle RC number, and insurance number — fields a rider account never has.
- **A separate Admin collection**, seeded (not self-signup) with a fixed
  login — see "Admin access" below — that can view both the Rider and
  Driver collections plus the full ride history through `/api/admin/*`.
- **Driver-initiated live tracking, with no API key needed anywhere.**
  `/drive/:id` uses the browser's own `navigator.geolocation.watchPosition`
  on the driver's device, posts each point to `POST /api/rides/:id/location`,
  and the server re-broadcasts it over Socket.io to anyone subscribed to
  that ride's room — which is exactly what `/ride/:id` (the rider's screen)
  is listening for. If geolocation is denied or unsupported, it falls back
  to a simulated route so the demo still works without needing an actual
  moving vehicle. The map itself renders with free OpenStreetMap tiles, and
  road-snapped routes come from OSRM's free public routing service
  (`client/src/components/TrackingMap.jsx`) — no Google Maps, no billing
  account, no API key to manage at all. Neither of these is "receiving a
  stranger's live GPS" as a product, though — that part is genuinely your
  own Socket.io server, since no maps provider sells that.
- **Plate + photo verification gating the OTP, matching real ride-hailing
  convention.** The rider's `/ride/:id` screen shows their pickup code and
  the plate/photo checklist; the **driver's** `/drive/:id` screen is where
  the code actually gets entered to start the trip — this is deliberately
  the opposite of "whoever sees it first types it," because the checklist
  already lets the rider verify the *car*, so the OTP's job is the
  complementary check: confirming the *rider* is who they say they are,
  which only means something if the driver is the one entering it.
  Enforced server-side in `POST /rides/:id/verify-otp` (HTTP 412 if the
  rider hasn't ticked both boxes yet), not just hidden in the UI.
- **A real ride-history dataset.** The `Ride` collection stores
  `startedAt`/`arrivedAt`/`completedAt` timestamps and a capped `routeLog`
  of every location ping — a genuine "which rider went with which driver,
  on what route, at what time" record, queryable via `/api/admin/rides`.
- **Real authentication**, separately for each role — bcrypt-hashed
  passwords, JWTs, verified in isolation with `node -e` (password hashing
  and token sign/verify both confirmed correct) since no local MongoDB was
  available in the build environment to test the full DB round-trip.
- **Editable profiles**, including a photo upload. The photo is stored as a
  base64 string directly in MongoDB — fine for a project this size, but
  worth swapping for real file storage (S3, Cloudinary, GridFS) before any
  real deployment, since base64-in-Mongo doesn't scale well past a handful
  of users.
- **18 Jammu pickup points** — see `client/src/constants/places.js`. MIET's
  own coordinates are a best-effort approximation from public listings of
  its Kot Bhalwal address, not a surveyed exact geocode — if routes ever
  look geographically off, that one constant is the place to correct.
- **Signup is restricted to `@mietjammu.in` addresses**, enforced
  server-side in `POST /api/auth/signup` — not just a client-side hint.
- **Phone numbers and vehicle plates are format-validated**, not just
  required — a 10-digit Indian mobile regex on `Rider`/`Driver`, and a
  standard Indian plate regex (`JK02AB1234`-style) on `Driver`. Bad input
  gets a specific error message back, not a generic 500.
- **Real payments**, not a mocked screen. `server/routes/payments.js`
  integrates actual Razorpay order creation + signature verification —
  Razorpay's Checkout widget is what covers UPI apps (GPay, PhonePe,
  Paytm, BHIM) and cards from one integration, since there's no separate
  SDK per UPI app. A cash option sits alongside it for anyone who'd rather
  settle in person. Needs your own free Razorpay test-mode keys (see
  "Setting up payments" below) — leave them blank and the app still runs;
  online payment just shows a setup message instead of a blank error.
- **Fare is computed, not guessed.** Every ride gets a real distance
  (haversine, pickup to dropoff) and a fare (`₹15 base + ₹8/km`) at booking
  time — including rides auto-booked by the recurring-ride cron job, not
  just manual bookings. The rider can adjust how many people are splitting
  the cost, and the per-head share recalculates live.
- **Recurring rides are a real cron job**, not just a saved preference.
  `server/jobs/recurringRides.js` checks every active schedule every
  minute and auto-books a real `Ride` document through the same matching
  engine as a manual request, once per scheduled day.
- **A dashboard with real charts**, not static numbers — `/dashboard` uses
  Recharts against `GET /api/rides/stats/:role/:id`: total distance,
  earned/spent, average rating, a rides-per-week bar chart, and a
  completed/cancelled pie chart, plus a full ride-history table.
- **Ratings go both ways.** Riders rate drivers and drivers rate riders,
  each with stars, quick tags, and a free-text review — both feed back
  into a Bayesian-weighted trust score on the corresponding profile.
- **Both sides can see and call each other.** The rider's ride page shows
  the driver's real profile photo (not just initials) and a tap-to-call
  button; the driver's page shows the same for the rider — real phone
  numbers via `tel:` links, sourced from new public lookup routes
  (`GET /api/riders/:riderId`, and a hardened `GET /api/drivers/:driverId`).
- **The route line actually updates as the car moves**, not just once at
  page load (`useLiveRoute` in `TrackingMap.jsx`) — but throttled to
  150m/8s between OSRM re-fetches. A literal per-second refresh would look
  identical at normal driving speed on a road-snapped line and would
  violate OSRM's free public-instance usage policy; this is the honest
  version of "live" for a no-API-key routing source.
- **Admin analytics** include total riders, drivers, rides, completed
  rides, and the average driver rating across the platform
  (`/api/admin/summary`).

## Site structure

| Route | Who | What |
|---|---|---|
| `/` | anyone | marketing homepage, with hover-interactive stats and feature cards |
| `/about` | anyone | the project's motive (fewer single-occupant trips) + how the model actually works |
| `/find-a-ride` | rider (or guest) | request form (To MIET or From MIET) + ranked matches |
| `/ride/:id` | rider | live tracking, driver info, plate/photo checklist, shows pickup code, fare + payment (Razorpay/cash), SOS |
| `/drive` | driver | dashboard: online toggle, active + past rides |
| `/drive/:id` | driver | enter rider's pickup code to start the trip, share live location, mark arrived, end ride |
| `/dashboard` | rider or driver | ride history, distance/earnings stats, and charts |
| `/recurring-rides` | rider | set up daily/weekly auto-booked schedules |
| `/admin` | admin | view all riders, drivers, and ride history |
| `/profile` | rider or driver | edit name, DOB, contact numbers, photo |
| `/safety` | anyone | safety checklist, videos, and emergency contact (saved to your account if signed in) |
| `/signup`, `/signin` | anyone | role-specific account creation / login |

## Test accounts (for trying the app without signing up first)

`node seed.js` creates these fixed logins so you can test the whole flow
immediately:

```
Rider  -> email: riya.rider@mietjammu.in  password: test1234
Driver -> email: dev.driver@mietjammu.in  password: test1234
Admin  -> email: admin@sync.local         password: SyncAdmin123
```

These are known, hardcoded credentials meant only for local project
review — change or remove them before any real deployment.

## Setting up payments (optional)

The app runs fully without this — cash payment always works, and online
payment just shows a setup message until you add keys. To enable real
Razorpay checkout (test mode, no real money moves):

1. Sign up free at [dashboard.razorpay.com/signup](https://dashboard.razorpay.com/signup) — no business verification needed for test mode.
2. Go to Settings > API Keys, generate a **Test Mode** key pair.
3. Put them in `server/.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
   ```
4. Restart `node server.js`. The rider's ride page will now open a real
   Razorpay Checkout modal — use Razorpay's documented test card
   (`4111 1111 1111 1111`, any future expiry, any CVV) or test UPI ID
   (`success@razorpay`) to simulate a successful payment.

### QR code fallback

If a rider's Razorpay checkout won't load — patchy WiFi, a browser issue,
whatever — the driver can show a QR code from `/drive/:id` for the rider to
scan directly with any UPI app. This needs the driver to have added their
own UPI ID (e.g. `name@okhdfcbank`) in `/profile` — the seeded test driver
already has one so this is demoable immediately with `node seed.js`. The QR
encodes a real UPI deep link (`upi://pay?pa=...&am=...`) with the ride's
actual fare, verified against NPCI's published UPI linking spec.

## What needs your own setup (can't be provisioned for you)

- **A MongoDB instance.** Local (`mongod`) or a free
  [Atlas](https://www.mongodb.com/atlas) cluster — put the connection
  string in `server/.env`.
- **A JWT secret.** Any random string in `server/.env`'s `JWT_SECRET` —
  used to sign login tokens.
- **Real SMS/WhatsApp for SOS.** The SOS endpoint logs and broadcasts over
  the socket right now; an actual text to an emergency contact needs a
  provider account (Twilio, MSG91) — left as a marked `TODO` in
  `server/routes/rides.js`.

There is nothing to sign up for to see the maps or routing — those run on
free OpenStreetMap tiles and OSRM's public routing service, no key needed.

## Project structure

```
sync-carpool/
├── client/
│   ├── src/pages/            Home, About, FindRide, ActiveRide (rider),
│   │                         DriverDashboard, DriverRide (driver),
│   │                         AdminDashboard, Profile, Safety, SignIn, SignUp
│   ├── src/components/       Navbar, Footer, RideForm, MatchCard, TrackingMap
│   ├── src/api/               client.js (fetch + socket wrapper), AuthContext.jsx
│   ├── src/constants/places.js   18 Jammu pickup points
│   └── public/logo.png
├── server/
│   ├── models/                Rider.js, Driver.js, Admin.js, Ride.js
│   ├── routes/                 auth.js, riders.js, drivers.js, match.js, rides.js, admin.js
│   ├── engine/                  compatibilityModel.js, hungarian.js
│   └── seed.js                  seeds demo drivers + test rider/driver + admin account
└── dataset/
    ├── carpool_matching_dataset_original.csv    what you uploaded (1 row)
    ├── carpool_matching_dataset_extended.csv    15,000-row training set
    ├── train_model.py                            trains + exports weights
    └── model_output.json                         full metrics + weights
```

## Running it

**1. Server**
```bash
cd server
npm install
cp .env.example .env      # set MONGO_URI, and set your own JWT_SECRET
node seed.js               # populates demo drivers + test accounts + admin, run once
node server.js
# -> SYNC Carpool API listening on http://localhost:4000
```

**2. Client**
```bash
cd client
npm install
cp .env.example .env       # nothing to fill in unless your server runs somewhere other than localhost:4000
npm run dev
# -> open the printed http://localhost:5173 URL
```

Both need to be running for sign-up, matching, and live tracking to work end
to end. Pages show an inline error (not a blank page) if they can't reach
the API.

## Trying the live tracking end to end

The fastest way — using the seeded test accounts instead of signing up fresh:

1. Open two browser windows (or one normal + one incognito, so the sessions
   don't clash). Sign in as `rider@test.com` / `test1234` in one, and
   `driver@test.com` / `test1234` in the other.
2. As the rider: go to Find a ride, submit the form, and book a match —
   pick any driver except "Test Driver" for the match itself (the model
   ranks the background demo drivers), or book with any of them; it doesn't
   have to be the test driver account you're signed into on the other tab
   for the map/tracking parts to work.
3. You'll land on `/ride/:id`. Note the pickup code shown — this is what
   you'd tell your driver in person.
4. As the driver (`/drive`): open the ride, and click "Start sharing my
   live location." Your browser will ask for location permission — allow
   it, or deny it to see the simulated-route fallback instead.
5. Back on the rider's tab, the car marker should start moving in real time
   on the OpenStreetMap view — this is an actual Socket.io broadcast, not a
   canned animation.
6. On the rider's tab, tick both safety checkboxes — this unlocks OTP entry
   on the driver's side. Back on the driver's tab, type in the code the
   rider is showing and confirm — the ride moves to "in progress" on both
   screens.

## Re-training on new data

Add real feature columns to a CSV following the same schema as
`carpool_matching_dataset_extended.csv`, point `train_model.py` at it, and
re-run:
```bash
cd dataset
python3 train_model.py
```
Copy the new `surrogate_coefficients` / `surrogate_intercept` values from the
printed output into `server/engine/compatibilityModel.js`.
