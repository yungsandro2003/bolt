import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface EmployeePanelProps {
  userId: number;
}

interface TimeRecord {
  id: number;
  user_id: number;
  type: 'entry' | 'pause' | 'return' | 'exit';
  timestamp: string;
}

interface ReportRecord {
  date: string;
  entry: string | null;
  pause: string | null;
  return: string | null;
  exit: string | null;
  worked_hours: number;
  balance: number;
}

interface AdjustmentRequest {
  id: number;
  date: string;
  type: 'entry' | 'pause' | 'return' | 'exit';
  new_time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface UserData {
  id: number;
  name: string;
  shift_hours: number;
}

export const EmployeePanel: React.FC<EmployeePanelProps> = ({ userId }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [todayRecords, setTodayRecords] = useState<TimeRecord[]>([]);
  const [reportRecords, setReportRecords] = useState<ReportRecord[]>([]);
  const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state for adjustment request
  const [adjustmentDate, setAdjustmentDate] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'entry' | 'pause' | 'return' | 'exit'>('entry');
  const [adjustmentTime, setAdjustmentTime] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, [userId]);

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadUserData(),
        loadTodayRecords(),
        loadReport(),
        loadAdjustmentRequests()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const data = await api.users.getMe();
      setUserData(data);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTodayRecords = async () => {
    try {
      const records = await api.timeRecords.getToday();
      setTodayRecords(records);
    } catch (error) {
      console.error('Error loading today records:', error);
    }
  };

  const loadReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const report = await api.timeRecords.getReport({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
      setReportRecords(report);
    } catch (error) {
      console.error('Error loading report:', error);
    }
  };

  const loadAdjustmentRequests = async () => {
    try {
      const requests = await api.adjustmentRequests.getAll();
      setAdjustmentRequests(requests);
    } catch (error) {
      console.error('Error loading adjustment requests:', error);
    }
  };

  const handleClockIn = async (type: 'entry' | 'pause' | 'return' | 'exit') => {
    setLoading(true);
    try {
      await api.timeRecords.create(type);
      await loadTodayRecords();
      await loadReport();
    } catch (error) {
      console.error('Error registering time:', error);
      alert('Erro ao registrar ponto');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.adjustmentRequests.create({
        date: adjustmentDate,
        new_time: adjustmentTime,
        type: adjustmentType,
        reason: adjustmentReason
      });

      // Reset form
      setAdjustmentDate('');
      setAdjustmentTime('');
      setAdjustmentReason('');
      setAdjustmentType('entry');

      // Reload requests
      await loadAdjustmentRequests();
      alert('Solicitação enviada com sucesso!');
    } catch (error) {
      console.error('Error submitting adjustment:', error);
      alert('Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entry':
        return '🟢';
      case 'pause':
        return '🟡';
      case 'return':
        return '🟠';
      case 'exit':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'entry':
        return 'Entrada';
      case 'pause':
        return 'Pausa';
      case 'return':
        return 'Retorno';
      case 'exit':
        return 'Saída';
      default:
        return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '🕒';
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Recusado';
      default:
        return status;
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(Math.abs(hours));
    const m = Math.round((Math.abs(hours) - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const getNextAction = () => {
    if (todayRecords.length === 0) return 'entry';
    const lastRecord = todayRecords[todayRecords.length - 1];

    switch (lastRecord.type) {
      case 'entry':
        return 'pause';
      case 'pause':
        return 'return';
      case 'return':
        return 'exit';
      case 'exit':
        return null;
      default:
        return 'entry';
    }
  };

  const nextAction = getNextAction();

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#0A1A2F', color: '#E0E0E0' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Painel do Colaborador</h1>

        {userData && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#253A4A' }}>
            <h2 className="text-xl font-semibold">Olá, {userData.name}!</h2>
            <p className="text-sm opacity-75">Jornada: {userData.shift_hours}h por dia</p>
          </div>
        )}

        {/* Seção de Registro de Ponto */}
        <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: '#253A4A' }}>
          <h2 className="text-2xl font-bold mb-4">Registro de Ponto</h2>

          {nextAction ? (
            <button
              onClick={() => handleClockIn(nextAction)}
              disabled={loading}
              className="w-full py-6 px-8 rounded-lg text-white text-xl font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0A6777' }}
            >
              {loading ? 'Registrando...' : `Registrar ${getTypeLabel(nextAction)}`}
            </button>
          ) : (
            <div className="w-full py-6 px-8 rounded-lg text-center text-lg" style={{ backgroundColor: '#1a2a3a' }}>
              Todos os registros do dia foram concluídos
            </div>
          )}

          {/* Batidas de Hoje */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Batidas de Hoje</h3>
            {todayRecords.length > 0 ? (
              <div className="flex flex-wrap gap-4 items-center">
                {todayRecords.map((record, index) => (
                  <React.Fragment key={record.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeIcon(record.type)}</span>
                      <span className="text-lg font-mono">{formatTime(record.timestamp)}</span>
                    </div>
                    {index < todayRecords.length - 1 && (
                      <span className="text-xl opacity-50">|</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p className="text-sm opacity-75">Nenhum registro hoje</p>
            )}
          </div>
        </div>

        {/* Meus Relatórios */}
        <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: '#253A4A' }}>
          <h2 className="text-2xl font-bold mb-4">Meus Relatórios (Últimos 30 dias)</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: '#0A6777' }}>
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Entrada</th>
                  <th className="pb-3 pr-4">Pausa</th>
                  <th className="pb-3 pr-4">Retorno</th>
                  <th className="pb-3 pr-4">Saída</th>
                  <th className="pb-3 pr-4">Horas Trabalhadas</th>
                  <th className="pb-3">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {reportRecords.length > 0 ? (
                  reportRecords.map((record) => (
                    <tr key={record.date} className="border-b border-opacity-20" style={{ borderColor: '#E0E0E0' }}>
                      <td className="py-3 pr-4">{formatDate(record.date)}</td>
                      <td className="py-3 pr-4 font-mono">{formatTime(record.entry)}</td>
                      <td className="py-3 pr-4 font-mono">{formatTime(record.pause)}</td>
                      <td className="py-3 pr-4 font-mono">{formatTime(record.return)}</td>
                      <td className="py-3 pr-4 font-mono">{formatTime(record.exit)}</td>
                      <td className="py-3 pr-4">{formatHours(record.worked_hours)}</td>
                      <td className="py-3 font-semibold" style={{ color: record.balance >= 0 ? '#4ade80' : '#ef4444' }}>
                        {record.balance >= 0 ? '+' : ''}{formatHours(record.balance)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 text-center opacity-75">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Solicitações de Ajuste */}
        <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: '#253A4A' }}>
          <h2 className="text-2xl font-bold mb-4">Solicitações de Ajuste</h2>

          {/* Formulário */}
          <form onSubmit={handleSubmitAdjustment} className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1a2a3a' }}>
            <h3 className="text-lg font-semibold mb-4">Nova Solicitação</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">Data</label>
                <input
                  type="date"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded bg-opacity-50 border"
                  style={{ backgroundColor: '#253A4A', borderColor: '#0A6777', color: '#E0E0E0' }}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Tipo de Registro</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  required
                  className="w-full px-3 py-2 rounded bg-opacity-50 border"
                  style={{ backgroundColor: '#253A4A', borderColor: '#0A6777', color: '#E0E0E0' }}
                >
                  <option value="entry">Entrada</option>
                  <option value="pause">Pausa</option>
                  <option value="return">Retorno</option>
                  <option value="exit">Saída</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">Novo Horário</label>
                <input
                  type="time"
                  value={adjustmentTime}
                  onChange={(e) => setAdjustmentTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded bg-opacity-50 border"
                  style={{ backgroundColor: '#253A4A', borderColor: '#0A6777', color: '#E0E0E0' }}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-2">Motivo da Solicitação</label>
              <textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                required
                rows={3}
                placeholder="Explique o motivo da correção..."
                className="w-full px-3 py-2 rounded bg-opacity-50 border"
                style={{ backgroundColor: '#253A4A', borderColor: '#0A6777', color: '#E0E0E0' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0A6777' }}
            >
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </form>

          {/* Lista de Solicitações */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Minhas Solicitações</h3>

            {adjustmentRequests.length > 0 ? (
              <div className="space-y-3">
                {adjustmentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg border-l-4"
                    style={{
                      backgroundColor: '#1a2a3a',
                      borderLeftColor:
                        request.status === 'approved'
                          ? '#4ade80'
                          : request.status === 'rejected'
                          ? '#ef4444'
                          : '#fbbf24'
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{getStatusIcon(request.status)}</span>
                          <span className="font-semibold">{getStatusLabel(request.status)}</span>
                          <span className="opacity-75">|</span>
                          <span>{formatDate(request.date)}</span>
                          <span className="opacity-75">|</span>
                          <span>{getTypeLabel(request.type)}</span>
                          <span className="opacity-75">|</span>
                          <span className="font-mono">{request.new_time}</span>
                        </div>
                        <p className="text-sm opacity-75 mb-1">
                          <strong>Motivo:</strong> {request.reason}
                        </p>
                        <p className="text-xs opacity-50">
                          Solicitado em {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm opacity-75 text-center py-4">Nenhuma solicitação encontrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

