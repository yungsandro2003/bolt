import { useState } from 'react';
import { Clock, CheckCircle, Coffee, LogIn, LogOut, PlayCircle } from 'lucide-react';
import { supabase, Employee, TimeRecord } from '../lib/supabase';

type RecordState = 'entry' | 'pause' | 'return' | 'exit' | 'completed';

export function ClockIn() {
  const [cpf, setCpf] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [recordState, setRecordState] = useState<RecordState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastRecordTime, setLastRecordTime] = useState<string>('');

  function formatCpf(value: string) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return numbers.slice(0, 11);
  }

  async function handleCpfSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setMessage({ type: 'error', text: 'CPF deve ter 11 dígitos' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('cpf', cleanCpf)
      .maybeSingle();

    if (employeeError || !employeeData) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Funcionário não encontrado. Verifique o CPF ou cadastre o funcionário.' });
      return;
    }

    setEmployee(employeeData);

    const today = new Date().toISOString().split('T')[0];

    const { data: recordData, error: recordError } = await supabase
      .from('time_records')
      .select('*')
      .eq('employee_id', employeeData.id)
      .eq('record_date', today)
      .maybeSingle();

    setLoading(false);

    if (recordError) {
      console.error('Erro ao buscar registro:', recordError);
      setRecordState('entry');
      return;
    }

    if (!recordData) {
      setRecordState('entry');
    } else {
      determineRecordState(recordData);
    }
  }

  function determineRecordState(record: TimeRecord) {
    if (record.exit_time) {
      setRecordState('completed');
      setMessage({ type: 'info', text: 'Jornada do dia já foi encerrada.' });
    } else if (record.pause_end_time) {
      setRecordState('exit');
    } else if (record.pause_start_time) {
      setRecordState('return');
    } else if (record.entry_time) {
      setRecordState('pause');
    } else {
      setRecordState('entry');
    }
  }

  async function handleRecord() {
    if (!employee || !recordState || recordState === 'completed') return;

    setLoading(true);
    setMessage(null);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { data: existingRecord } = await supabase
      .from('time_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('record_date', today)
      .maybeSingle();

    let error;

    if (recordState === 'entry') {
      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('time_records')
          .update({ entry_time: now })
          .eq('id', existingRecord.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('time_records')
          .insert([{
            employee_id: employee.id,
            record_date: today,
            entry_time: now,
          }]);
        error = insertError;
      }
    } else if (recordState === 'pause') {
      const { error: updateError } = await supabase
        .from('time_records')
        .update({ pause_start_time: now })
        .eq('id', existingRecord!.id);
      error = updateError;
    } else if (recordState === 'return') {
      const { error: updateError } = await supabase
        .from('time_records')
        .update({ pause_end_time: now })
        .eq('id', existingRecord!.id);
      error = updateError;
    } else if (recordState === 'exit') {
      const { error: updateError } = await supabase
        .from('time_records')
        .update({ exit_time: now })
        .eq('id', existingRecord!.id);
      error = updateError;
    }

    setLoading(false);

    if (error) {
      console.error('Erro ao registrar ponto:', error);
      setMessage({ type: 'error', text: 'Erro ao registrar ponto. Tente novamente.' });
      return;
    }

    const time = new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setLastRecordTime(time);
    setMessage({ type: 'success', text: `Ponto registrado com sucesso às ${time}!` });

    const { data: updatedRecord } = await supabase
      .from('time_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('record_date', today)
      .maybeSingle();

    if (updatedRecord) {
      determineRecordState(updatedRecord);
    }
  }

  function handleReset() {
    setCpf('');
    setEmployee(null);
    setRecordState(null);
    setMessage(null);
    setLastRecordTime('');
  }

  function getButtonConfig() {
    switch (recordState) {
      case 'entry':
        return {
          icon: LogIn,
          text: 'Registrar Entrada',
          color: 'bg-green-600 hover:bg-green-700',
        };
      case 'pause':
        return {
          icon: Coffee,
          text: 'Iniciar Pausa',
          color: 'bg-yellow-600 hover:bg-yellow-700',
        };
      case 'return':
        return {
          icon: PlayCircle,
          text: 'Retorno da Pausa',
          color: 'bg-blue-600 hover:bg-blue-700',
        };
      case 'exit':
        return {
          icon: LogOut,
          text: 'Registrar Saída',
          color: 'bg-red-600 hover:bg-red-700',
        };
      default:
        return null;
    }
  }

  const buttonConfig = getButtonConfig();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-lg shadow-2xl p-8" style={{ backgroundColor: '#253A4A' }}>
          <div className="flex items-center justify-center mb-8">
            <div className="p-4 rounded-full" style={{ backgroundColor: '#0A6777' }}>
              <Clock className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center mb-2" style={{ color: '#E0E0E0' }}>
            Registrar Ponto
          </h2>
          <p className="text-center mb-8" style={{ color: '#E0E0E0B3' }}>
            Digite seu CPF para continuar
          </p>

          {!employee ? (
            <form onSubmit={handleCpfSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#E0E0E0' }}>
                  CPF
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  className="w-full px-4 py-3 border rounded-lg text-center text-xl focus:outline-none focus:ring-2"
                  style={{ backgroundColor: '#0A1A2F', borderColor: '#0A67774D', color: '#E0E0E0' }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  autoFocus
                />
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.type === 'success'
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : message.type === 'error'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#0A6777' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0A6777CC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A6777'}
              >
                {loading ? 'Buscando...' : 'Continuar'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg p-4 border" style={{ backgroundColor: '#0A1A2F', borderColor: '#0A67774D' }}>
                <p className="text-sm mb-1" style={{ color: '#E0E0E099' }}>Funcionário</p>
                <p className="font-medium text-lg" style={{ color: '#E0E0E0' }}>{employee.name}</p>
                <p className="text-sm mt-1" style={{ color: '#0A6777' }}>{employee.shift}</p>
              </div>

              {message && (
                <div
                  className={`p-4 rounded-lg flex items-center space-x-3 ${
                    message.type === 'success'
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : message.type === 'error'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
                  <span>{message.text}</span>
                </div>
              )}

              {recordState === 'completed' ? (
                <div className="rounded-lg p-6 text-center border" style={{ backgroundColor: '#0A1A2F', borderColor: '#0A67774D' }}>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium" style={{ color: '#E0E0E0' }}>Jornada do dia encerrada</p>
                  <p className="text-sm mt-2" style={{ color: '#E0E0E099' }}>
                    Você já registrou todos os pontos de hoje
                  </p>
                </div>
              ) : buttonConfig ? (
                <button
                  onClick={handleRecord}
                  disabled={loading}
                  className={`w-full ${buttonConfig.color} text-white font-medium py-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2`}
                >
                  <buttonConfig.icon className="w-5 h-5" />
                  <span>{loading ? 'Registrando...' : buttonConfig.text}</span>
                </button>
              ) : null}

              <button
                onClick={handleReset}
                className="w-full font-medium py-3 rounded-lg transition-colors border"
                style={{ backgroundColor: '#0A1A2F', color: '#E0E0E0', borderColor: '#0A67774D' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E3A36'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A1A2F'}
              >
                Voltar
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: '#E0E0E066' }}>
          Sistema de Controle de Ponto Eletrônico
        </p>
      </div>
    </div>
  );
}
