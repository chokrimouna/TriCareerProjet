import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { AppLayout } from '../components/AppLayout';
import { Auth } from '../pages/auth';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { CVs } from '../pages/CVs';
import { Decisions } from '../pages/Decisions';
import { Users } from '../pages/Users';
import CreateUser from '../pages/Users/CreateUser';
import { AdminDashboard } from '../pages/AdminDashboard';
import { Dashboard } from '../pages/Dashboard';
import { Profile } from '../pages/Profile';
import { TeamLeaderCalendar } from '../pages/TeamLeaderCalendar';
import { TeamLeaderInterviews } from '../pages/TeamLeaderInterviews';
import { TeamLeaderTests } from '../pages/TeamLeaderTests';
import { TeamLeaderCandidates } from '../pages/TeamLeaderCandidates';
import { TeamLeaderDashboard } from '../pages/TeamLeaderDashboard';
import { RHCVAnalysis } from '../pages/RHCVAnalysis';
import { RHDashboard } from '../pages/RHDashboard';
import { CandidateDashboard } from '../pages/CandidateDashboard';
import { CandidateCalendar } from '../pages/CandidateCalendar';
import { MyInterviews } from '../pages/MyInterviews';
import { MyTests } from '../pages/MyTests';
import { CVsArchive } from '../pages/CVsArchive';
import { NotFound } from '../pages/NotFound';
import { ProtectedRoute } from './ProtectedRoute';
import { VideoInterview } from '../pages/Interview/VideoInterview';
import { getRoleRedirect } from '../helpers/getRoleRedirect';
import Postes from '../pages/Postes';
import AdminFormulaire from '../pages/AdminFormulaire';
import AdminCalendar from '../pages/AdminCalendar';
import CandidateApply from '../pages/CandidateApply';
import { Vitrine } from '../pages/Vitrine';
import { JobDetail } from '../pages/Vitrine/JobDetail';
import { Calendar } from '../pages/Calendar';
import { CandidateExam } from '../pages/CandidateExam';
import { FinalDecision } from '../pages/FinalDecision';
import { DepartmentManagement } from '../pages/DepartmentManagement';
import { SmtpSettings } from '../pages/SmtpSettings';
import { AdminNotifications } from '../pages/AdminNotifications';
import { TestChecklistManagement } from '../pages/TestChecklistManagement';
import { CandidateRanking } from '../pages/CandidateRanking';
import { CVAnalysisAI } from '../pages/CVAnalysisAI';

function PublicOnlyAuth() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user = useSelector((s: RootState) => s.auth.user);
  if (isAuthenticated) {
    const role = (user as { role?: string; Role?: string } | null)?.role || user?.Role || '';
    return <Navigate to={getRoleRedirect(role)} replace />;
  }
  return <Auth />;
}

function RoleCalendarRedirect() {
  const user = useSelector((s: RootState) => s.auth.user);
  const rawRole = user?.Role ?? (user as { role?: string } | null)?.role ?? '';
  const role = (typeof rawRole === 'object'
    ? ((rawRole as any)?.Description ?? (rawRole as any)?.description ?? '')
    : String(rawRole)).toLowerCase();
  
  if (role === 'candidate') {
    return <CandidateCalendar />;
  }
  return <TeamLeaderCalendar />;
}

function RoleDashboardRedirect() {
  const user = useSelector((s: RootState) => s.auth.user);
  const rawRole = user?.Role ?? (user as { role?: string } | null)?.role ?? '';
  const role = typeof rawRole === 'object'
    ? ((rawRole as any)?.Description ?? (rawRole as any)?.description ?? '')
    : String(rawRole);
  return <Navigate to={getRoleRedirect(role)} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/jobs" replace />,
  },
  {
    path: '/login',
    element: <PublicOnlyAuth />,
  },
  {
    path: '/register',
    element: <PublicOnlyAuth />,
  },
  {
    path: '/forgot-password',
    Component: ForgotPassword,
  },
  {
    path: '/apply/:jobId',
    element: <CandidateApply />,
  },
  {
    path: '/exam/:id',
    element: <CandidateExam />,
  },
  {
    path: '/test/:id',
    element: <CandidateExam />,
  },
  {
    path: '/jobs',
    element: <Vitrine />,
  },
  {
    path: '/jobs/:id',
    element: <JobDetail />,
  },
  {
    path: '/',
    Component: AppLayout,
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <RoleDashboardRedirect />
          </ProtectedRoute>
        ),
      },
      {
        path: 'cvs',
        element: (
          <ProtectedRoute>
            <CVs />
          </ProtectedRoute>
        ),
      },
      {
        path: 'cvs/:id',
        element: (
          <ProtectedRoute>
            <CVs />
          </ProtectedRoute>
        ),
      },
      {
        path: 'decisions',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'RH']}>
            <Decisions />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Users />
          </ProtectedRoute>
        ),
      },
      {
        // Le bouton "Nouvel Utilisateur" navigue vers /users/create : cette route
        // n'existait pas (retombait sur la page 404) — corrigé.
        path: 'users/create',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <CreateUser />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Users />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/profile',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/profile',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teamleader/profile',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/*',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/postes',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Postes />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/formulaire',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminFormulaire />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/calendar',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Calendar />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/archives',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <CVsArchive />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/interviews',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <TeamLeaderInterviews />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/tests',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <TeamLeaderTests />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/candidats',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <TeamLeaderCandidates />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/departments',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <DepartmentManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/checklists',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'RH']}>
            <TestChecklistManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/smtp',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <SmtpSettings />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/notifications',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminNotifications />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/notifications',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <AdminNotifications />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-leader/notifications',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <AdminNotifications />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <TeamLeaderDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/cv-analysis',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <RHCVAnalysis />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-leader/cv-analysis',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <RHCVAnalysis />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/cv-analysis',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <RHCVAnalysis />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <TeamLeaderDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-leader/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <TeamLeaderDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teamleader/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <TeamLeaderDashboard />
          </ProtectedRoute>
        ),
      },

      {
        path: 'candidate/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['Candidate']}>
            <CandidateDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-calendar',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <TeamLeaderCalendar />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-leader/calendar',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <TeamLeaderCalendar />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin-calendar',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'RH']}>
            <TeamLeaderCalendar />
          </ProtectedRoute>
        ),
      },
      {
        path: 'calendar',
        element: (
          <ProtectedRoute>
            <RoleCalendarRedirect />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-interviews',
        element: (
          <ProtectedRoute>
            <MyInterviews />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-tests',
        element: (
          <ProtectedRoute>
            <MyTests />
          </ProtectedRoute>
        ),
      },
      {
        path: 'cvs-archive',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'RH']}>
            <CVsArchive />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-interviews',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin', 'RH', 'hr']}>
            <TeamLeaderInterviews />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-leader/interviews',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'RH', 'hr']}>
            <TeamLeaderInterviews />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-tests',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'RH', 'hr']}>
            <TeamLeaderTests />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-leader/tests',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'RH', 'hr']}>
            <TeamLeaderTests />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-candidates',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin', 'RH', 'hr']}>
            <TeamLeaderCandidates />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-leader/candidates',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin', 'RH', 'hr']}>
            <TeamLeaderCandidates />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teamleader/candidats',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <TeamLeaderCandidates />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teamleader/calendar',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <TeamLeaderCalendar />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teamleader/interviews',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <TeamLeaderInterviews />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teamleader/tests',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <TeamLeaderTests />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/decisions',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <FinalDecision />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/candidates',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <TeamLeaderCandidates />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/interviews',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <TeamLeaderInterviews />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/tests',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <TeamLeaderTests />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/departments',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <DepartmentManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/checklists',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <TestChecklistManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/archives',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <CVsArchive />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/ranking',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <CandidateRanking />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-leader/ranking',
        element: (
          <ProtectedRoute allowedRoles={['TeamLeader', 'Team Leader', 'Admin']}>
            <CandidateRanking />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/ranking',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <CandidateRanking />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rh/calendar',
        element: (
          <ProtectedRoute allowedRoles={['RH', 'Admin']}>
            <TeamLeaderCalendar />
          </ProtectedRoute>
        ),
      },
      {
        path: 'interview/:id',
        element: (
          <ProtectedRoute>
            <VideoInterview />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    Component: NotFound,
  },
]);

