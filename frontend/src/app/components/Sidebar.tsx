import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquare,
  Brain,
  Settings,
  UserCircle,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LogOut,
  Sparkles,
  Archive,
  Shield,
  ClipboardList,
  Building,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getNavItems = () => {
    const baseItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ];

    const rawRole = user?.Role || (user as any)?.role || '';
    const userRole = typeof rawRole === 'object'
      ? (rawRole?.Description || rawRole?.description || '')
      : String(rawRole);
    const roleLower = userRole.toLowerCase();

    if (roleLower === 'admin') {
      return [
        ...baseItems,
        { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
        { path: '/admin/candidats', icon: Users, label: 'Candidats' },
        { path: '/admin/postes', icon: Briefcase, label: 'Postes' },
        { path: '/admin/tests', icon: ClipboardList, label: 'Tests' },
        { path: '/admin/interviews', icon: MessageSquare, label: 'Entretiens' },
        { path: '/admin/calendar', icon: CalendarIcon, label: 'Calendrier' },
        { path: '/admin/departments', icon: Building, label: 'Départements' },
      ];
    }

    if (roleLower === 'rh' || roleLower === 'hr') {
      return [
        ...baseItems,
        { path: '/team-leader/candidates', icon: Users, label: 'Candidats' },
        { path: '/team-leader/interviews', icon: MessageSquare, label: 'Entretiens' },
        { path: '/team-leader/tests', icon: ClipboardList, label: 'Tests' },
        { path: '/rh/cv-analysis', icon: Sparkles, label: 'Analyse CV' },
        { path: '/cvs-archive', icon: Archive, label: 'Archives' },
        { path: '/rh/decisions', icon: Brain, label: 'Décision Finale' },
        { path: '/admin-calendar', icon: CalendarIcon, label: 'Calendrier' },
        { path: '/profile', icon: UserCircle, label: 'Mon Profil' },
      ];
    }

    if (roleLower === 'team_leader' || roleLower === 'teamleader') {
      return [
        ...baseItems,
        { path: '/team-leader/candidates', icon: Users, label: 'Candidats' },
        { path: '/team-leader/calendar', icon: CalendarIcon, label: 'Calendrier' },
        { path: '/team-leader/interviews', icon: MessageSquare, label: 'Entretiens' },
        { path: '/team-leader/tests', icon: ClipboardList, label: 'Tests' },
        { path: '/profile', icon: UserCircle, label: 'Mon Profil' },
      ];
    }

    // Candidate
    return [
      ...baseItems,
      { path: '/my-tests', icon: FileText, label: 'Mes Tests' },
      { path: '/calendar', icon: CalendarIcon, label: 'Calendrier' },
      { path: '/my-interviews', icon: MessageSquare, label: 'Entretiens' },
      { path: '/profile', icon: UserCircle, label: 'Mon Profil' },
    ];
  };

  const navItems = getNavItems();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0"
    >
      <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <img src="/src/imports/logo-text.png" alt="TriWeb" className="h-8" />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium"
              >
                Déconnexion
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
