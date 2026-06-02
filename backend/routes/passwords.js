const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Save a password analysis result
router.post('/save', authMiddleware, (req, res) => {
  try {
    const { label, score, strength, length, has_upper, has_lower, has_number, has_special, entropy, crack_time, suggestions } = req.body;
    const id = uuidv4();
    run(
      `INSERT INTO password_history (id, user_id, label, score, strength, length, has_upper, has_lower, has_number, has_special, entropy, crack_time, suggestions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, label || 'Unnamed', score, strength, length, has_upper ? 1 : 0, has_lower ? 1 : 0, has_number ? 1 : 0, has_special ? 1 : 0, entropy, crack_time, JSON.stringify(suggestions || [])]
    );
    res.json({ message: 'Saved', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Save failed' });
  }
});

// Get history
router.get('/history', authMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const rows = all(
      'SELECT * FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, limit, offset]
    );
    const total = get('SELECT COUNT(*) as count FROM password_history WHERE user_id = ?', [req.user.id]);
    res.json({ rows: rows.map(r => ({ ...r, suggestions: JSON.parse(r.suggestions || '[]') })), total: total?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// Delete a history entry
router.delete('/history/:id', authMiddleware, (req, res) => {
  try {
    run('DELETE FROM password_history WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Get stats
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const total = get('SELECT COUNT(*) as count FROM password_history WHERE user_id = ?', [req.user.id]);
    const avgScore = get('SELECT AVG(score) as avg FROM password_history WHERE user_id = ?', [req.user.id]);
    const byStrength = all('SELECT strength, COUNT(*) as count FROM password_history WHERE user_id = ? GROUP BY strength', [req.user.id]);
    const best = get('SELECT * FROM password_history WHERE user_id = ? ORDER BY score DESC LIMIT 1', [req.user.id]);
    res.json({ total: total?.count || 0, avgScore: Math.round(avgScore?.avg || 0), byStrength, best });
  } catch (err) {
    res.status(500).json({ error: 'Stats failed' });
  }
});

module.exports = router;
