import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AdminHeader } from './components/AdminHeader';
import { EmployeeHeader } from './components/EmployeeHeader';
import { AdminDashboard } from './components/AdminDashboard';
import { ShiftManagement } from './components/ShiftManagement';
import { EmployeeManagement } from './components/EmployeeManagement';
import { RequestsCenter } from './components/RequestsCenter';
import { AdvancedReports } from './components/AdvancedReports';
import { EmployeePanel } from './components/EmployeePanel';

type AdminPage = 'dashboard' | 'shifts' | 'employees' | 'requests' | 'reports';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A1A2F' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#0A6777' }}></div>
          <p style={{ color: '#E0E0E0' }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.role === 'admin') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0A1A2F' }}>
        <AdminHeader currentPage={currentPage} onNavigate={setCurrentPage} />
        <main>
          {currentPage === 'dashboard' && <AdminDashboard />}
          {currentPage === 'shifts' && <ShiftManagement />}
          {currentPage === 'employees' && <EmployeeManagement />}
          {currentPage === 'requests' && <RequestsCenter adminUserId={user.id} />}
          {currentPage === 'reports' && <AdvancedReports />}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A1A2F' }}>
      <EmployeeHeader />
      <main>
        <EmployeePanel userId={user.id} />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
