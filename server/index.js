const express = require('express');
const cors = require('cors');
const setup = require('./setup');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const shiftRoutes = require('./routes/shifts');
const timeRecordRoutes = require('./routes/timeRecords');
const adjustmentRequestRoutes = require('./routes/adjustmentRequests');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

setup();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/time-records', timeRecordRoutes);
app.use('/api/adjustment-requests', adjustmentRequestRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VivaPonto API rodando' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor VivaPonto rodando na porta ${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}/api`);
  console.log(`✨ Pronto para receber requisições!\n`);
});
