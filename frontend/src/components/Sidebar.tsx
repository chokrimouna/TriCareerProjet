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
  Home,
  Trophy,
  Bell,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLogout } from '../hooks/useLogout';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';

export function Sidebar() {
  const location = useLocation();
  const user = useSelector((s: RootState) => s.auth.user);
  const logout = useLogout();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getNavItems = () => {
    const baseItems = [
      { path: '/jobs', icon: Home, label: 'Accueil' },
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
        { path: '/admin/ranking', icon: Trophy, label: 'Candidats recommandés' },
        { path: '/admin/cv-analysis', icon: Brain, label: 'Analyse CV' },
        { path: '/rh/decisions', icon: Sparkles, label: 'Décision Finale' },
        { path: '/admin/postes', icon: Briefcase, label: 'Postes' },
        { path: '/admin/tests', icon: ClipboardList, label: 'Tests' },
        { path: '/admin/interviews', icon: MessageSquare, label: 'Entretiens' },
        { path: '/admin-calendar', icon: CalendarIcon, label: 'Calendrier' },
        { path: '/admin/departments', icon: Building, label: 'Départements' },
        { path: '/admin/smtp', icon: Settings, label: 'Paramètres SMTP' },
        { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
        { path: '/profile', icon: UserCircle, label: 'Mon Profil' },
      ];
    }

    if (roleLower === 'rh' || roleLower === 'hr') {
      return [
        ...baseItems,
        { path: '/rh/candidates', icon: Users, label: 'Candidats' },
        { path: '/rh/ranking', icon: Trophy, label: 'Candidats recommandés' },
        { path: '/rh/cv-analysis', icon: Brain, label: 'Analyse CV' },
        { path: '/rh/decisions', icon: Sparkles, label: 'Décision Finale' },
        { path: '/rh/calendar', icon: CalendarIcon, label: 'Calendrier' },
        { path: '/rh/interviews', icon: MessageSquare, label: 'Entretiens' },
        { path: '/rh/tests', icon: ClipboardList, label: 'Tests' },
        { path: '/cvs-archive', icon: Archive, label: 'Archives' },
        { path: '/rh/notifications', icon: Bell, label: 'Notifications' },
        { path: '/profile', icon: UserCircle, label: 'Mon Profil' },
      ];
    }

    if (roleLower === 'team_leader' || roleLower === 'teamleader') {
      return [
        ...baseItems,
        { path: '/team-leader/candidates', icon: Users, label: 'Candidats' },
        { path: '/team-leader/ranking', icon: Trophy, label: 'Candidats recommandés' },
        { path: '/team-leader/cv-analysis', icon: Brain, label: 'Analyse CV' },
        { path: '/team-leader/calendar', icon: CalendarIcon, label: 'Calendrier' },
        { path: '/team-leader/notifications', icon: Bell, label: 'Notifications' },
        { path: '/profile', icon: UserCircle, label: 'Mon Profil' },
      ];
    }

    return [
      ...baseItems,
      { path: '/my-tests', icon: FileText, label: 'Mes Tests' },
      { path: '/calendar', icon: CalendarIcon, label: 'Calendrier' },
      { path: '/my-interviews', icon: MessageSquare, label: 'Entretiens' },
      { path: '/profile', icon: UserCircle, label: 'Mon Profil' },
    ];
  };

  const navItems = getNavItems();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#F87171] text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                TC
              </div>
              <span className="text-xl font-black tracking-tight text-sidebar-foreground">
                Tri<span className="text-[#DC2626]">Career</span>
              </span>
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
          const isActive =
            location.pathname === item.path ||
            (item.path === '/dashboard' && (
              location.pathname === '/admin/dashboard' ||
              location.pathname === '/rh/dashboard' ||
              location.pathname === '/team-leader/dashboard' ||
              location.pathname === '/candidate/dashboard' ||
              location.pathname === '/rh' ||
              location.pathname === '/team-leader'
            ));
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

      <div className="p-4 border-t border-sidebar-border space-y-3">
        {!isCollapsed && (
          <Link
            to="/jobs"
            className="flex items-center justify-center gap-2 w-full h-11 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 mb-2"
          >
            <Sparkles className="w-4 h-4" />
            Voir les offres
          </Link>
        )}
        
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
