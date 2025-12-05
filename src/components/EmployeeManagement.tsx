import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { api } from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface Shift {
  id: number;
  name: string;
  start_time: string;
  break_start: string;
  break_end: string;
  end_time: string;
  total_minutes: number;
}

interface Employee extends User {
  shift?: Shift;
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadEmployees();
    loadShifts();
  }, []);

  async function loadEmployees() {
    try {
      const data = await api.users.getAll();
      const employeesOnly = data.filter((user: User) => user.role === 'employee');
      setEmployees(employeesOnly || []);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  }

  async function loadShifts() {
    try {
      const data = await api.shifts.getAll();
      setShifts(data || []);
      if (data && data.length > 0) {
        setShiftId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar turnos:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !cpf || !email || !password || !shiftId) {
      setMessage({ type: 'error', text: 'Preencha todos os campos' });
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setMessage({ type: 'error', text: 'CPF deve ter 11 dígitos' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.auth.register({
        name,
        email,
        cpf: cleanCpf,
        password,
        role: 'employee',
        shift_id: shiftId
      });

      setLoading(false);
      setMessage({ type: 'success', text: 'Funcionário cadastrado com sucesso!' });
      setName('');
      setCpf('');
      setEmail('');
      setPassword('');
      setShiftId(shifts.length > 0 ? shifts[0].id : null);
      loadEmployees();
    } catch (err: any) {
      setLoading(false);
      const errorMessage = err.message || 'Erro ao cadastrar funcionário';
      if (errorMessage.includes('email')) {
        setMessage({ type: 'error', text: 'Email já cadastrado' });
      } else if (errorMessage.includes('cpf')) {
        setMessage({ type: 'error', text: 'CPF já cadastrado' });
      } else {
        setMessage({ type: 'error', text: errorMessage });
      }
      console.error('Erro:', err);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Deseja realmente excluir este funcionário? Todos os registros de ponto serão perdidos.')) {
      return;
    }

    try {
      await api.users.delete(id);
      setMessage({ type: 'success', text: 'Funcionário excluído com sucesso!' });
      loadEmployees();
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error);
      setMessage({ type: 'error', text: 'Erro ao excluir funcionário' });
    }
  }

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

  function displayCpf(cpf: string) {
    return cpf
      .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#E0E0E0' }}>Gestão de Funcionários</h2>
        <p style={{ color: '#E0E0E0B3' }}>Cadastre e gerencie os colaboradores da empresa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg shadow-xl p-6" style={{ backgroundColor: '#253A4A' }}>
          <div className="flex items-center space-x-2 mb-6">
            <UserPlus className="w-5 h-5" style={{ color: '#0A6777' }} />
            <h3 className="text-xl font-semibold" style={{ color: '#E0E0E0' }}>Novo Funcionário</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#E0E0E0' }}>
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#0A1A2F', borderColor: '#0A67774D', color: '#E0E0E0' }}
                placeholder="Digite o nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#E0E0E0' }}>
                CPF
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#0A1A2F', borderColor: '#0A67774D', color: '#E0E0E0' }}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#E0E0E0' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#0A1A2F', borderColor: '#0A67774D', color: '#E0E0E0' }}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#E0E0E0' }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#0A1A2F', borderColor: '#0A67774D', color: '#E0E0E0' }}
                placeholder="Digite a senha"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#E0E0E0' }}>
                Turno de Trabalho
              </label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#0A1A2F', borderColor: '#0A67774D', color: '#E0E0E0' }}
              >
                {shifts.length === 0 ? (
                  <option value="">Carregando turnos...</option>
                ) : (
                  shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
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
              {loading ? 'Cadastrando...' : 'Cadastrar Funcionário'}
            </button>
          </form>
        </div>

        <div className="rounded-lg shadow-xl p-6" style={{ backgroundColor: '#253A4A' }}>
          <div className="flex items-center space-x-2 mb-6">
            <Users className="w-5 h-5" style={{ color: '#0A6777' }} />
            <h3 className="text-xl font-semibold" style={{ color: '#E0E0E0' }}>Funcionários Cadastrados</h3>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {employees.length === 0 ? (
              <p className="text-center py-8" style={{ color: '#E0E0E099' }}>
                Nenhum funcionário cadastrado ainda
              </p>
            ) : (
              employees.map((employee) => (
                <div
                  key={employee.id}
                  className="rounded-lg p-4 flex items-center justify-between transition-colors"
                  style={{ backgroundColor: '#0A1A2F' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E3A3680'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A1A2F'}
                >
                  <div>
                    <h4 className="font-medium" style={{ color: '#E0E0E0' }}>{employee.name}</h4>
                    <p className="text-sm" style={{ color: '#E0E0E099' }}>
                      Email: {employee.email}
                    </p>
                    {employee.shift && (
                      <p className="text-xs mt-1" style={{ color: '#0A6777' }}>
                        Turno: {employee.shift.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(employee.id)}
                    className="p-2 text-red-400 rounded-lg transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EF444433'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
