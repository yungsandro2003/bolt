const db = require('./database');
const bcrypt = require('bcryptjs');

async function setup() {
  console.log('Iniciando setup do banco de dados...');

  const adminPassword = await bcrypt.hash('teste', 10);

  db.get('SELECT * FROM users WHERE email = ?', ['testeempresa@gmail.com'], (err, row) => {
    if (err) {
      console.error('Erro ao verificar admin:', err);
      return;
    }

    if (!row) {
      db.run(
        `INSERT INTO users (name, email, cpf, password, role) VALUES (?, ?, ?, ?, ?)`,
        ['Administrador', 'testeempresa@gmail.com', '00000000000', adminPassword, 'admin'],
        (err) => {
          if (err) {
            console.error('Erro ao criar admin:', err);
          } else {
            console.log('✓ Admin padrão criado: testeempresa@gmail.com / teste');
          }
        }
      );
    } else {
      console.log('✓ Admin padrão já existe');
    }
  });

  db.all('SELECT * FROM shifts', [], (err, rows) => {
    if (err) {
      console.error('Erro ao verificar turnos:', err);
      return;
    }

    if (rows.length === 0) {
      const shifts = [
        ['Manhã 08-17h', '08:00', '12:00', '13:00', '17:00', 480],
        ['Tarde 13-22h', '13:00', '17:00', '18:00', '22:00', 480],
        ['Noite 22-06h', '22:00', '02:00', '03:00', '06:00', 420]
      ];

      shifts.forEach(([name, start, breakStart, breakEnd, end, minutes]) => {
        db.run(
          `INSERT INTO shifts (name, start_time, break_start, break_end, end_time, total_minutes) VALUES (?, ?, ?, ?, ?, ?)`,
          [name, start, breakStart, breakEnd, end, minutes],
          (err) => {
            if (err) {
              console.error('Erro ao criar turno:', err);
            } else {
              console.log(`✓ Turno criado: ${name}`);
            }
          }
        );
      });
    } else {
      console.log('✓ Turnos padrão já existem');
    }
  });

  console.log('Setup concluído!');
}

module.exports = setup;
