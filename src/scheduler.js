// scheduler.js
// Runs on a timer (cron) and checks every target to see if it's time to
// send a reminder. This is the "brain" of the notification feature.

const cron = require('node-cron');
const nodemailer = require('nodemailer');
const db = require('./db');

// --- Email setup ---
// If EMAIL_USER / EMAIL_PASS are not set in .env, we fall back to just
// logging the notification to the console so you can still test everything
// without configuring real email credentials.
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // use a Gmail "App Password", not your real password
    },
  });
}

async function sendReminder(toEmail, subject, message) {
  if (transporter) {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject,
      text: message,
    });
    console.log(`[EMAIL SENT] to ${toEmail}: ${subject}`);
  } else {
    // Fallback for local testing without email configured
    console.log(`[MOCK EMAIL] to ${toEmail} | ${subject} | ${message}`);
  }
}

// Checks all targets and fires reminders where needed.
// This function is exported so it can also be run manually (e.g. from a test script).
async function checkAndNotify() {
  const now = new Date();

  const targets = db
    .prepare(
      `SELECT targets.*, users.email, users.name
       FROM targets
       JOIN users ON users.id = targets.user_id
       WHERE targets.status != 'done'`
    )
    .all();

  for (const target of targets) {
    // 1. Registration opening reminder
    if (target.registration_open_date && target.status === 'pending') {
      const openDate = new Date(target.registration_open_date);
      if (openDate <= now) {
        await sendReminder(
          target.email,
          `Registration is OPEN: ${target.title}`,
          `Hey ${target.name}, registration for "${target.title}" (${target.type}) just opened!\nLink: ${target.source_url || 'N/A'}`
        );
        db.prepare('UPDATE targets SET status = ? WHERE id = ?').run(
          'notified_open',
          target.id
        );
        db.prepare(
          'INSERT INTO notifications (target_id, type) VALUES (?, ?)'
        ).run(target.id, 'registration_open');
      }
    }

    // 2. Deadline approaching reminder (based on remind_before_hours)
    if (target.deadline && target.status !== 'notified_deadline') {
      const deadline = new Date(target.deadline);
      const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);

      if (hoursUntilDeadline <= target.remind_before_hours && hoursUntilDeadline > 0) {
        await sendReminder(
          target.email,
          `Deadline approaching: ${target.title}`,
          `Hey ${target.name}, the deadline for "${target.title}" (${target.type}) is coming up on ${target.deadline}.\nLink: ${target.source_url || 'N/A'}`
        );
        db.prepare('UPDATE targets SET status = ? WHERE id = ?').run(
          'notified_deadline',
          target.id
        );
        db.prepare(
          'INSERT INTO notifications (target_id, type) VALUES (?, ?)'
        ).run(target.id, 'deadline_approaching');
      }
    }
  }
}

// Runs the check every hour. Cron syntax: minute hour day month weekday.
function startScheduler() {
  cron.schedule('0 * * * *', () => {
    console.log('[SCHEDULER] Running hourly check...');
    checkAndNotify().catch((err) => console.error('[SCHEDULER ERROR]', err));
  });
  console.log('[SCHEDULER] Started — checking every hour.');
}

module.exports = { startScheduler, checkAndNotify };
