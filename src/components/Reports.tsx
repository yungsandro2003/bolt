import { useState, useEffect } from 'react';
import { FileText, Calendar } from 'lucide-react';
import { supabase, Employee, TimeRecordWithEmployee } from '../lib/supabase';

export function Reports() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [records, setRecords] = useState<TimeRecordWithEmployee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadRecords();
    }
  }, [selectedEmployeeId]);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');

    if (error) {
      console.error('Erro ao carregar funcionários:', error);
      return;
    }

    setEmployees(data || []);
    if (data && data.length > 0) {
      setSelectedEmployeeId(data[0].id);
    }
  }

  async function loadRecords() {
    if (!selectedEmployeeId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('time_records')
      .select(`
        *,
        employees (*)
      `)
      .eq('employee_id', selectedEmployeeId)
      .order('record_date', { ascending: false });

    setLoading(false);

    if (error) {
      console.error('Erro ao carregar registros:', error);
      return;
    }

    setRecords(data || []);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatTime(timeString: string | null) {
    if (!timeString) return '-';
    const date = new Date(timeString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function calculateWorkHours(record: TimeRecordWithEmployee) {
    if (!record.entry_time || !record.exit_time) {
      return 'Incompleto';
    }

    const entry = new Date(record.entry_time);
    const exit = new Date(record.exit_time);

    let totalMinutes = (exit.getTime() - entry.getTime()) / (1000 * 60);

    if (record.pause_start_time && record.pause_end_time) {
      const pauseStart = new Date(record.pause_start_time);
      const pauseEnd = new Date(record.pause_end_time);
      const pauseMinutes = (pauseEnd.getTime() - pauseStart.getTime()) / (1000 * 60);
      totalMinutes -= pauseMinutes;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return `${hours}h ${minutes}m`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#E0E0E0' }}>Relatório de Pontos</h2>
        <p style={{ color: '#E0E0E0B3' }}>Visualize o histórico de registros dos funcionários</p>
      </div>

      <div className="rounded-lg shadow-xl p-6 mb-6" style={{ backgroundColor: '#253A4A' }}>
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="w-5 h-5" style={{ color: '#0A6777' }} />
          <h3 className="text-xl font-semibold" style={{ color: '#E0E0E0' }}>Filtros</h3>
        </div>

        <div className="max-w-md">
          <label className="block text-sm font-medium mb-2" style={{ color: '#E0E0E0' }}>
            Selecione o Funcionário
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
            style={{ backgroundColor: '#0A1A2F', borderColor: '#0A67774D', color: '#E0E0E0' }}
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} - CPF: {employee.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg shadow-xl p-6" style={{ backgroundColor: '#253A4A' }}>
        <div className="flex items-center space-x-2 mb-6">
          <Calendar className="w-5 h-5" style={{ color: '#0A6777' }} />
          <h3 className="text-xl font-semibold" style={{ color: '#E0E0E0' }}>Histórico de Registros</h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#0A6777' }}></div>
            <p className="mt-4" style={{ color: '#E0E0E099' }}>Carregando registros...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: '#E0E0E04D' }} />
            <p style={{ color: '#E0E0E099' }}>Nenhum registro encontrado para este funcionário</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#0A67774D' }}>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: '#E0E0E0' }}>Data</th>
                  <th className="text-center py-3 px-4 font-semibold" style={{ color: '#E0E0E0' }}>Entrada</th>
                  <th className="text-center py-3 px-4 font-semibold" style={{ color: '#E0E0E0' }}>Início Pausa</th>
                  <th className="text-center py-3 px-4 font-semibold" style={{ color: '#E0E0E0' }}>Retorno Pausa</th>
                  <th className="text-center py-3 px-4 font-semibold" style={{ color: '#E0E0E0' }}>Saída</th>
                  <th className="text-center py-3 px-4 font-semibold" style={{ color: '#E0E0E0' }}>Horas Trabalhadas</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b transition-colors"
                    style={{ borderColor: '#0A67771A' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0A1A2F80'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium" style={{ color: '#E0E0E0' }}>
                        {new Date(record.record_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs capitalize" style={{ color: '#E0E0E099' }}>
                        {new Date(record.record_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className="inline-block px-3 py-1 rounded"
                        style={record.entry_time ? { backgroundColor: '#22C55E33', color: '#86EFAC' } : { color: '#E0E0E066' }}
                      >
                        {formatTime(record.entry_time)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className="inline-block px-3 py-1 rounded"
                        style={record.pause_start_time ? { backgroundColor: '#EAB30833', color: '#FDE047' } : { color: '#E0E0E066' }}
                      >
                        {formatTime(record.pause_start_time)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className="inline-block px-3 py-1 rounded"
                        style={record.pause_end_time ? { backgroundColor: '#3B82F633', color: '#93C5FD' } : { color: '#E0E0E066' }}
                      >
                        {formatTime(record.pause_end_time)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className="inline-block px-3 py-1 rounded"
                        style={record.exit_time ? { backgroundColor: '#EF444433', color: '#FCA5A5' } : { color: '#E0E0E066' }}
                      >
                        {formatTime(record.exit_time)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-block px-3 py-1 rounded font-medium" style={{ backgroundColor: '#0A677733', color: '#0A6777' }}>
                        {calculateWorkHours(record)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
