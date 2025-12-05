import { Clock, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function EmployeeHeader() {
  const { user, logout } = useAuth();

  return (
    <header style={{ backgroundColor: '#1E3A36' }} className="shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div style={{ backgroundColor: '#0A6777' }} className="p-2 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 style={{ color: '#E0E0E0' }} className="text-xl font-bold">VivaPonto</h1>
              <p style={{ color: '#E0E0E0', opacity: 0.7 }} className="text-xs">Controle de Jornada</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-lg" style={{ backgroundColor: '#0A1A2F' }}>
              <User className="w-4 h-4" style={{ color: '#0A6777' }} />
              <span className="text-sm" style={{ color: '#E0E0E0' }}>{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: '#0A1A2F', color: '#E0E0E0' }}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
