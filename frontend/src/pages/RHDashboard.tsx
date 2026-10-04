import { Users, FileText, Calendar, TrendingUp, Clock, CheckCircle, XCircle, MessageSquare, Sparkles, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useApplications } from '../hooks/useApplications';
import { useInterviews } from '../hooks/useInterviews';
import { useJobPostings } from '../hooks/useJobPostings';
import { useUsers } from '../hooks/useUsers';

// Dummy data removed as it is now fetched from the API

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function RHDashboard() {
  const navigate = useNavigate();
  const { data: applicationsRaw, loading: applicationsLoading, error: applicationsError } = useApplications();
  const { data: interviewsRaw, loading: interviewsLoading, error: interviewsError } = useInterviews();
  const { data: jobPostingsRaw, loading: jobPostingsLoading, error: jobPostingsError } = useJobPostings();
  const { data: usersRaw, loading: usersLoading, error: usersError } = useUsers();
  
  const applications = Array.isArray(applicationsRaw) ? applicationsRaw : [];
  const interviews = Array.isArray(interviewsRaw) ? interviewsRaw : [];
  const jobPostings = Array.isArray(jobPostingsRaw) ? jobPostingsRaw : [];
  const users = Array.isArray(usersRaw) ? usersRaw : [];

  const isLoading = applicationsLoading || interviewsLoading || jobPostingsLoading || usersLoading;
  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const errorMessage = applicationsError || interviewsError || jobPostingsError || usersError;
  if (errorMessage) {
    return <div className="p-8 text-error">{errorMessage}</div>;
  }

  const totalCandidates = applications.length;
  const enCours = applications.filter((c: any) =>
    String(c.Status ?? c.status ?? '').toLowerCase().includes('cours') ||
    String(c.Status ?? c.status ?? '').toLowerCase().includes('pending')).length;
  const termine = applications.filter((c: any) =>
    String(c.Status ?? c.status ?? '').toLowerCase().includes('term') ||
    String(c.Status ?? c.status ?? '').toLowerCase().includes('complete') ||
    String(c.Status ?? c.status ?? '').toLowerCase().includes('accept')).length;

  const scheduledInterviews = interviews.filter((i: any) =>
    String(i.Status ?? i.status ?? '').toLowerCase().includes('sched') ||
    String(i.Status ?? i.status ?? '').toLowerCase().includes('plan')).length;

  const avgCVScore = totalCandidates > 0
    ? Math.round(applications.reduce((acc: number, c: any) => acc + Number(c.CvScore ?? c.cvScore ?? 0), 0) / totalCandidates)
    : 0;

  const pipelineData = [
    { name: 'CV Reçus', value: applications.length },
    { name: 'Présélectionnés', value: users.length },
    { name: 'Entretiens', value: interviews.length },
    {
      name: 'Embauches',
      value: applications.filter((a: any) =>
        String(a.Status ?? a.status ?? '').toLowerCase().includes('accept') ||
        String(a.Status ?? a.status ?? '').toLowerCase().includes('hired')).length,
    },
  ];

  const activityData = weekDays.map((day, index) => {
    const today = new Date();
    const dayDate = new Date(today.setDate(today.getDate() - today.getDay() + index + 1)).toISOString().split('T')[0];
    return {
      name: day,
      candidats: applications.filter((a: any) => (a.ApplicationDate ?? a.applicationDate ?? '').includes(dayDate)).length,
      entretiens: interviews.filter((i: any) => (i.Date ?? i.date ?? '').includes(dayDate)).length,
    };
  });

  const timelineEvents = [
    ...applications.slice(0, 2).map((a: any, idx: number) => ({
      id: `cv-${idx}`,
      type: 'cv',
      title: `${a.CandidateName ?? a.candidateName ?? a.Name ?? a.name ?? 'Candidat'} - CV analysé`,
      position: a.Position ?? a.position ?? a.JobTitle ?? a.jobTitle ?? 'Poste',
      timestamp: 'Récent',
    })),
    ...interviews.slice(0, 2).map((i: any, idx: number) => ({
      id: `interview-${idx}`,
      type: 'interview',
      title: `Entretien - ${i.CandidateName ?? i.candidateName ?? i.Name ?? i.name ?? 'Candidat'}`,
      position: i.Position ?? i.position ?? 'Entretien',
      timestamp: i.Date ?? i.date ?? 'À venir',
    })),
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard RH</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble du recrutement et des candidatures
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 text-white shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-4xl font-bold mb-2">{totalCandidates}</p>
          <p className="text-sm opacity-90">Total Candidats</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Calendar className="w-8 h-8 text-primary" />
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-4xl font-bold mb-2">{scheduledInterviews}</p>
          <p className="text-sm text-muted-foreground">Entretiens Planifiés</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Sparkles className="w-8 h-8 text-primary" />
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-4xl font-bold mb-2">{avgCVScore}%</p>
          <p className="text-sm text-muted-foreground">Score CV Moyen</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-8 h-8 text-primary" />
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-4xl font-bold mb-2">{termine}</p>
          <p className="text-sm text-muted-foreground">Processus Terminés</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Pipeline de recrutement</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData}>
                <defs>
                  <linearGradient id="rhPipelineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity={1} />
                    <stop offset="100%" stopColor="#F87171" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="url(#rhPipelineGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Activité hebdomadaire</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="candidats" stroke="#DC2626" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="entretiens" stroke="#F87171" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Activité récente</h3>
            <div className="space-y-4">
              {timelineEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-all">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    event.type === 'cv' ? 'bg-primary/10' :
                    event.type === 'interview' ? 'bg-primary/10' :
                    event.type === 'decision' ? 'bg-primary/10' :
                    'bg-primary/10'
                  }`}>
                    {event.type === 'cv' && <FileText className="w-5 h-5 text-primary" />}
                    {event.type === 'interview' && <MessageSquare className="w-5 h-5 text-primary" />}
                    {event.type === 'decision' && <CheckCircle className="w-5 h-5 text-primary" />}
                    {event.type === 'test' && <Sparkles className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-1">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.position}</p>
                    <p className="text-xs text-muted-foreground mt-1">{event.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
