// routes/targets.js
// CRUD for the internships/hackathons a user wants to track.
// All routes here require a valid JWT (see middleware/auth.js).

const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth); // every route below needs a logged-in user

// GET /targets - list all targets for the logged-in user
router.get('/', (req, res) => {
  const targets = db
    .prepare('SELECT * FROM targets WHERE user_id = ? ORDER BY deadline ASC')
    .all(req.userId);
  res.json(targets);
});

// POST /targets - add a new internship/hackathon to track
router.post('/', (req, res) => {
  const {
    title,
    type,
    source_url,
    registration_open_date,
    deadline,
    remind_before_hours,
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'title and type are required' });
  }
  if (!['internship', 'hackathon'].includes(type)) {
    return res.status(400).json({ error: "type must be 'internship' or 'hackathon'" });
  }

  const result = db
    .prepare(
      `INSERT INTO targets
        (user_id, title, type, source_url, registration_open_date, deadline, remind_before_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.userId,
      title,
      type,
      source_url || null,
      registration_open_date || null,
      deadline || null,
      remind_before_hours || 24
    );

  const created = db.prepare('SELECT * FROM targets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /targets/:id - update a target (only if it belongs to the user)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare('SELECT * FROM targets WHERE id = ? AND user_id = ?')
    .get(id, req.userId);

  if (!existing) {
    return res.status(404).json({ error: 'Target not found' });
  }

  const fields = [
    'title',
    'type',
    'source_url',
    'registration_open_date',
    'deadline',
    'remind_before_hours',
    'status',
  ];

  const updates = {};
  fields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const setClause = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(', ');

  if (setClause) {
    db.prepare(`UPDATE targets SET ${setClause} WHERE id = ?`).run(
      ...Object.values(updates),
      id
    );
  }

  const updated = db.prepare('SELECT * FROM targets WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /targets/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare('SELECT * FROM targets WHERE id = ? AND user_id = ?')
    .get(id, req.userId);

  if (!existing) {
    return res.status(404).json({ error: 'Target not found' });
  }

  db.prepare('DELETE FROM targets WHERE id = ?').run(id);
  res.json({ deleted: true });
});

module.exports = router;
