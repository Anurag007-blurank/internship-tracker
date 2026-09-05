# Deadline Watch — Internship/Hackathon Reminder Tracker

Tracks internships and hackathons you're targeting, and sends you a reminder
when registration opens or a deadline is approaching.

## Stack
- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`) — a single file, no server to install
- **Auth:** JWT + bcrypt password hashing
- **Scheduler:** `node-cron` — checks every hour for due reminders
- **Email:** `nodemailer` (falls back to console logging if no email is configured)
- **Frontend:** plain HTML/CSS/JS (no build step, no framework)

## How it works
1. You sign up / log in → get a JWT token (stored in the browser).
2. You add a "target" (internship or hackathon) with its registration-open
   date and/or deadline.
3. Every hour, `scheduler.js` scans all targets:
   - If `registration_open_date` has passed and no reminder was sent yet → sends one.
   - If the deadline is within `remind_before_hours` hours → sends one.
4. Every sent reminder is logged in the `notifications` table (a simple audit trail).

## Project structure
```
internship-tracker/
├── src/
│   ├── server.js          # Express app entry point
│   ├── db.js               # SQLite connection + schema
│   ├── scheduler.js         # Cron job + notification logic
│   ├── middleware/auth.js   # JWT verification
│   └── routes/
│       ├── auth.js          # signup/login
│       └── targets.js       # CRUD for tracked targets
├── public/index.html       # Frontend (served automatically by Express)
├── .env.example
└── package.json
```

## Running it locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your `.env` file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set `JWT_SECRET` to any random string. Leave `EMAIL_USER`
   / `EMAIL_PASS` blank for now — reminders will just print to the console.

3. Start the server:
   ```bash
   npm start
   ```

4. Open **http://localhost:3000** in your browser. Sign up, add a target,
   and click **"Run reminder check now"** to trigger the scheduler manually
   instead of waiting an hour — watch your terminal for the `[MOCK EMAIL]` log.

## Turning on real email
1. Enable 2-Step Verification on a Gmail account.
2. Create an App Password: https://myaccount.google.com/apppasswords
3. Put your Gmail address in `EMAIL_USER` and the app password in `EMAIL_PASS` in `.env`.
4. Restart the server — reminders will now actually be emailed.

## What to say about this in an interview
- **Why SQLite, not Postgres?** Zero setup — the whole DB is one file. Swapping
  to Postgres later only requires changing `db.js`; the SQL and route code
  barely change, since `better-sqlite3` uses standard SQL.
- **Why a cron job instead of setInterval?** `node-cron` uses standard cron
  syntax, survives restarts more predictably, and is easy to reason about
  (`'0 * * * *'` = every hour, on the hour).
- **How does it avoid duplicate notifications?** Each target has a `status`
  column (`pending` → `notified_open` → `notified_deadline`). Once a
  reminder type fires, the status changes so the scheduler skips it next run.
- **How would this scale?** Move the cron check into a queue (e.g. BullMQ +
  Redis) so thousands of targets don't get scanned in one blocking loop;
  swap SQLite for Postgres; add pagination to `/targets`.
- **Security basics covered:** passwords are hashed with bcrypt (never stored
  in plain text), and all target routes require a valid JWT tied to the
  requesting user, so users can only see/edit their own data.

## Natural next features to add
- Web scraping (Puppeteer) to auto-detect when a hackathon page opens registration
- Push notifications via Firebase Cloud Messaging (mobile/web push)
- A "browse hackathons" page pulling from Devpost/Unstop APIs
