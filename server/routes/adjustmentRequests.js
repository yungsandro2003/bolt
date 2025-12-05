const express = require('express');
const db = require('../database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const { status } = req.query;

  let query = `
    SELECT ar.*, u.name as user_name, u.email as user_email
    FROM adjustment_requests ar
    JOIN users u ON ar.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'employee') {
    query += ' AND ar.user_id = ?';
    params.push(req.user.id);
  }

  if (status) {
    query += ' AND ar.status = ?';
    params.push(status);
  }

  query += ' ORDER BY ar.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar solicitações' });
    }
    res.json(rows);
  });
});

router.post('/', authenticateToken, (req, res) => {
  const { date, old_time, new_time, type, reason } = req.body;
  const user_id = req.user.id;

  if (!date || !new_time || !type || !reason) {
    return res.status(400).json({ error: 'Campos obrigatórios: date, new_time, type, reason' });
  }

  if (!['entry', 'break_start', 'break_end', 'exit'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }

  db.run(
    `INSERT INTO adjustment_requests (user_id, date, old_time, new_time, type, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, date, old_time || null, new_time, type, reason],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao criar solicitação' });
      }

      res.status(201).json({
        id: this.lastID,
        user_id,
        date,
        old_time,
        new_time,
        type,
        reason,
        status: 'pending'
      });
    }
  );
});

router.put('/:id/approve', authenticateToken, isAdmin, (req, res) => {
  const requestId = req.params.id;
  const adminId = req.user.id;

  db.get('SELECT * FROM adjustment_requests WHERE id = ?', [requestId], (err, request) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar solicitação' });
    }
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Solicitação já foi processada' });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
        `DELETE FROM time_records WHERE user_id = ? AND date = ? AND type = ?`,
        [request.user_id, request.date, request.type],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Erro ao processar aprovação' });
          }

          db.run(
            `INSERT INTO time_records (user_id, date, time, type) VALUES (?, ?, ?, ?)`,
            [request.user_id, request.date, request.new_time, request.type],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Erro ao processar aprovação' });
              }

              db.run(
                `UPDATE adjustment_requests SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [adminId, requestId],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Erro ao processar aprovação' });
                  }

                  db.run('COMMIT');
                  res.json({ message: 'Solicitação aprovada com sucesso' });
                }
              );
            }
          );
        }
      );
    });
  });
});

router.put('/:id/reject', authenticateToken, isAdmin, (req, res) => {
  const requestId = req.params.id;
  const adminId = req.user.id;

  db.run(
    `UPDATE adjustment_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'pending'`,
    [adminId, requestId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao rejeitar solicitação' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Solicitação não encontrada ou já processada' });
      }
      res.json({ message: 'Solicitação rejeitada com sucesso' });
    }
  );
});

module.exports = router;
