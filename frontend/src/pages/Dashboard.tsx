import { useState } from 'react';
import { FileText, Users, MessageSquare, Briefcase, TrendingUp, Clock, CheckCircle, Calendar, ArrowRight, Zap, PieChart as PieIcon, BarChart as BarIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'motion/react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { useApplications } from '../hooks/useApplications';
import { useInterviews } from '../hooks/useInterviews';
import { useJobPostings } from '../hooks/useJobPostings';
import { useUsers } from '../hooks/useUsers';

export function Dashboard() {
  const user = useSelector((s: RootState) => s.auth.user);
  const { data: applicationsRaw, loading: applicationsLoading } = useApplications();
  const { data: interviewsRaw, loading: interviewsLoading } = useInterviews();
  const { data: jobPostingsRaw, loading: jobPostingsLoading } = useJobPostings();
  const { data: usersRaw, loading: usersLoading } = useUsers();

  const applications = Array.isArray(applicationsRaw) ? applicationsRaw : [];
  const interviews = Array.isArray(interviewsRaw) ? interviewsRaw : [];
  const jobPostings = Array.isArray(jobPostingsRaw) ? jobPostingsRaw : [];
  const users = Array.isArray(usersRaw) ? usersRaw : [];

  const isLoading = applicationsLoading || interviewsLoading || jobPostingsLoading || usersLoading;

  if (isLoading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-8 border-primary/10 border-t-primary rounded-full animate-spin" />
        <p className="text-2xl font-black text-muted-foreground uppercase tracking-[0.3em] animate-pulse">Initialisation...</p>
      </div>
    );
  }

  const computedStats = {
    totalApplications: applications.length,
    scheduledInterviews: interviews.filter((i: any) => i.idStatus !== 4 && i.IdStatus !== 4 && !String(i.Status ?? i.status ?? '').toLowerCase().includes('complet')).length,
    completedInterviews: interviews.filter((i: any) => i.idStatus === 4 || i.IdStatus === 4 || String(i.Status ?? i.status ?? '').toLowerCase().includes('complet')).length,
    totalEmployers: users.filter((u: any) => {
      const r = (u.Role || u.role || '').toString().toLowerCase();
      return r !== '' && !r.includes('candidate');
    }).length,
    activeJobPostings: jobPostings.filter((j: any) => Boolean(j.IsActive ?? j.isActive ?? true)).length,
  };

  const statusDistribution = [
    {
      name: 'En attente', value: applications.filter((a: any) => {
        const s = String(a.Status ?? a.status ?? '').toLowerCase();
        return s === '' || s.includes('pending') || s.includes('attente');
      }).length, color: '#94a3b8'
    },
    {
      name: 'En cours', value: applications.filter((a: any) => {
        const s = String(a.Status ?? a.status ?? '').toLowerCase();
        return s.includes('cours') || s.includes('progress');
      }).length, color: '#3b82f6'
    },
    {
      name: 'Acceptés', value: applications.filter((a: any) => {
        const s = String(a.Status ?? a.status ?? '').toLowerCase();
        return s.includes('accept');
      }).length, color: '#10b981'
    },
    {
      name: 'Refusés', value: applications.filter((a: any) => {
        const s = String(a.Status ?? a.status ?? '').toLowerCase();
        return s.includes('reject') || s.includes('refus');
      }).length, color: '#ef4444'
    },
  ].filter(d => d.value > 0);

  const pipelineData = [
    { name: 'CVs Reçus', value: applications.length },
    { name: 'Sélect.', value: applications.filter((a: any) => Number(a.CvScore ?? a.cvScore ?? 0) > 70).length },
    { name: 'Entretiens', value: interviews.length },
    { name: 'Hires', value: applications.filter((a: any) => String(a.Status ?? a.status ?? '').toLowerCase().includes('accept')).length },
  ];

  const renderAdminDashboard = () => (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-3 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">


        </div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm font-medium max-w-2xl leading-relaxed">
          Surveillez la performance de vos recrutements avec précision.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Candidatures', value: computedStats.totalApplications, icon: FileText, color: 'primary' },
          { label: 'Entretiens (Planifiés)', value: computedStats.scheduledInterviews, icon: Calendar, color: 'blue' },
          { label: 'Entretiens (Terminés)', value: computedStats.completedInterviews, icon: CheckCircle, color: 'emerald' },
          { label: 'Employeurs', value: computedStats.totalEmployers, icon: Users, color: 'indigo' },
          { label: 'Postes actifs', value: computedStats.activeJobPostings, icon: Briefcase, color: 'emerald' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform ${stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                  stat.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' :
                    'bg-emerald-500/10 text-emerald-500'
                }`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight leading-none">{stat.value}</p>
                <p className="text-sm font-semibold text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border/50 rounded-[3rem] p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold  tracking-tighter">Répartition Statuts</h3>
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <PieIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <div className="h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={6} dataKey="value" stroke="none">
                  {statusDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold tracking-tighter">{computedStats.totalApplications}</p>
              <p className="text-[9px] font-bold  tracking-widest text-muted-foreground">Dossiers</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-[3rem] p-8 shadow-xl relative">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold  tracking-tighter">Pipeline Recrutement</h3>
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <BarIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barDashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity={1} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }} />
                <Bar dataKey="value" fill="url(#barDashGradient)" radius={[12, 12, 12, 12]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


    </div>
  );

  return (user?.Role?.Description || user?.role?.description || user?.Role || user?.role || '').toString().toLowerCase() === 'candidate'
    ? <div className="p-10"><h1 className="text-3xl font-black">Bienvenue, {user?.Username}</h1></div>
    : renderAdminDashboard();
}
