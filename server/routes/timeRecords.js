const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const { user_id, date, start_date, end_date } = req.query;

  let query = 'SELECT * FROM time_records WHERE 1=1';
  const params = [];

  if (req.user.role === 'employee') {
    query += ' AND user_id = ?';
    params.push(req.user.id);
  } else if (user_id) {
    query += ' AND user_id = ?';
    params.push(user_id);
  }

  if (date) {
    query += ' AND date = ?';
    params.push(date);
  }

  if (start_date && end_date) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  query += ' ORDER BY date DESC, time DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar registros' });
    }
    res.json(rows);
  });
});

router.get('/today', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  db.all(
    'SELECT * FROM time_records WHERE user_id = ? AND date = ? ORDER BY created_at ASC',
    [req.user.id, today],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar registros de hoje' });
      }

      const record = {
        id: null,
        user_id: req.user.id,
        date: today,
        entry: null,
        break_start: null,
        break_end: null,
        exit: null,
        created_at: null,
        updated_at: null
      };

      rows.forEach(row => {
        if (row.type === 'entry') record.entry = row.time;
        if (row.type === 'break_start') record.break_start = row.time;
        if (row.type === 'break_end') record.break_end = row.time;
        if (row.type === 'exit') record.exit = row.time;
        if (!record.id) record.id = row.id;
        if (!record.created_at) record.created_at = row.created_at;
      });

      res.json(record);
    }
  );
});

router.post('/', authenticateToken, (req, res) => {
  const { type } = req.body;
  const user_id = req.user.id;
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].substring(0, 8);

  if (!type || !['entry', 'break_start', 'break_end', 'exit'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }

  db.run(
    'INSERT INTO time_records (user_id, date, time, type) VALUES (?, ?, ?, ?)',
    [user_id, date, time, type],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao registrar ponto' });
      }

      res.status(201).json({
        id: this.lastID,
        user_id,
        date,
        time,
        type
      });
    }
  );
});

router.get('/report', authenticateToken, (req, res) => {
  const { user_id, start_date, end_date } = req.query;

  let query = `
    SELECT
      date,
      MAX(CASE WHEN type = 'entry' THEN time END) as entry,
      MAX(CASE WHEN type = 'break_start' THEN time END) as break_start,
      MAX(CASE WHEN type = 'break_end' THEN time END) as break_end,
      MAX(CASE WHEN type = 'exit' THEN time END) as exit
    FROM time_records
    WHERE 1=1
  `;

  const params = [];

  if (req.user.role === 'employee') {
    query += ' AND user_id = ?';
    params.push(req.user.id);
  } else if (user_id) {
    query += ' AND user_id = ?';
    params.push(user_id);
  }

  if (start_date && end_date) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  query += ' GROUP BY date ORDER BY date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erro na query de relatório:', err);
      return res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
    res.json(rows);
  });
});

module.exports = router;
