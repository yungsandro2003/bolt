const express = require('express');
const db = require('../database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, isAdmin, (req, res) => {
  db.all(
    `SELECT u.*, s.name as shift_name FROM users u
     LEFT JOIN shifts s ON u.shift_id = s.id
     WHERE u.role = 'employee'`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar funcionários' });
      }
      res.json(rows);
    }
  );
});

router.get('/me', authenticateToken, (req, res) => {
  db.get(
    'SELECT u.*, s.* FROM users u LEFT JOIN shifts s ON u.shift_id = s.id WHERE u.id = ?',
    [req.user.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar usuário' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      const { password, ...userWithoutPassword } = row;
      res.json(userWithoutPassword);
    }
  );
});

router.get('/stats', authenticateToken, isAdmin, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  db.get('SELECT COUNT(*) as total FROM users WHERE role = "employee"', [], (err, employeeCount) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar estatísticas' });

    db.get('SELECT COUNT(*) as total FROM adjustment_requests WHERE status = "pending"', [], (err, requestsCount) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar estatísticas' });

      db.get(
        `SELECT COUNT(DISTINCT user_id) as total FROM time_records WHERE date = ? AND type = 'entry'`,
        [today],
        (err, presentCount) => {
          if (err) return res.status(500).json({ error: 'Erro ao buscar estatísticas' });

          res.json({
            totalEmployees: employeeCount.total,
            pendingRequests: requestsCount.total,
            presentToday: presentCount.total
          });
        }
      );
    });
  });
});

router.delete('/:id', authenticateToken, isAdmin, (req, res) => {
  db.run('DELETE FROM users WHERE id = ? AND role = "employee"', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao deletar funcionário' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    res.json({ message: 'Funcionário deletado com sucesso' });
  });
});

module.exports = router;
