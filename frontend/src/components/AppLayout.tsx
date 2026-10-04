import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ChatAssistant } from './ChatAssistant';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';


export function AppLayout() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>

      </div>
      {/* Assistant IA (bulle d'aide flottante, adaptée au rôle) */}
      <ChatAssistant />
    </div>
  );
}
