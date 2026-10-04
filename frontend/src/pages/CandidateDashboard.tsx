import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MessageSquare, PlayCircle, Zap, Calendar, Video } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { api } from '../helpers/apiClient';

export function CandidateDashboard() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const [stats, setStats] = useState({
    totalApplications: 0,
    upcomingInterviews: 0,
    totalInterviews: 0,
    availableTests: 0,
    completedTests: 0
  });
  const [applications, setApplications] = useState<any[]>([]);
  const [testScores, setTestScores] = useState<any[]>([]);
  const [interviewStatus, setInterviewStatus] = useState<any[]>([]);
  const [myInterviews, setMyInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userEmail = String(user?.Email ?? (user as any)?.email ?? '').toLowerCase();
        const userId = String(user?.Id ?? (user as any)?.id ?? (user as any)?.userId ?? '');

        if (!userEmail && !userId) {
          setLoading(false);
          return;
        }

        // 1. Fetch Applications
        const allApps = await api.get<any[]>('/api/Application/getAllApps').catch(() => []);
        const myApps = allApps.filter(a => {
          const appEmail = (a.Email ?? a.email ?? '').toLowerCase().trim();
          const aUserId = String(a.UserId ?? a.userId ?? '');
          return (userEmail && appEmail === userEmail) || (userId && aUserId === userId);
        });
        setApplications(myApps);

        const myAppIds = myApps.map(a => a.ApplicationId ?? a.applicationId).filter(id => id);

        // 2. Fetch Interviews (RecruitementProcess)
        const allProcesses = await api.get<any[]>('/api/RecruitementProcess').catch(() => []);
        const myInterviews = allProcesses.filter(p => {
          const pAppId = p.ApplicationId ?? p.applicationId;
          const pApp = p.Application ?? p.application;
          const pAppEmail = (pApp?.Email ?? pApp?.email ?? '').toLowerCase().trim();
          
          return myAppIds.includes(pAppId) || (userEmail && pAppEmail === userEmail);
        });
        setMyInterviews(myInterviews);
        
        const upcomingCount = myInterviews.filter(p => (p.IdStatus ?? p.idStatus) < 4).length;
        
        // Interview Status Chart Data
        const statusCounts: Record<string, number> = {};
        myInterviews.forEach(p => {
          const statusName = p.IdStatusNavigation?.NameStatus ?? p.idStatusNavigation?.nameStatus ?? 'Planifié';
          statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
        });
        setInterviewStatus(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

        // 3. Fetch Tests (Sessions)
        let totalTests = 0;
        let completedCount = 0;
        const scores: any[] = [];
        
        for (const appId of myAppIds) {
          const sessions = await api.get<any[]>(`/api/Sessions/GetSessionAllByIdApp/${appId}`).catch(() => []);
          totalTests += sessions.length;
          const completed = sessions.filter(s => {
            const innerSession = s.session ?? s.Session ?? s;
            return innerSession.sessionState === true || innerSession.SessionState === true;
          });
          completedCount += completed.length;
          completed.forEach(s => {
            const innerSession = s.session ?? s.Session ?? s;
            scores.push({
              name: innerSession.Examen?.Titre ?? innerSession.examen?.titre ?? innerSession.Examn?.Titre ?? innerSession.examn?.titre ?? 'Test',
              score: s.score ?? s.Score ?? innerSession.score ?? innerSession.Score ?? 0
            });
          });
        }
        setTestScores(scores);

        setStats({
          totalApplications: myApps.length,
          upcomingInterviews: upcomingCount,
          totalInterviews: myInterviews.length,
          availableTests: totalTests - completedCount,
          completedTests: completedCount
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-8 border-primary/10 border-t-primary rounded-full animate-spin" />
        <p className="text-2xl font-black text-muted-foreground uppercase tracking-[0.3em] animate-pulse">Chargement...</p>
      </div>
    );
  }

  // User requested "red and gray" pie charts
  const appStatusData = [
    { name: 'Acceptés', value: applications.filter(a => (a.Status ?? a.status ?? '').toLowerCase().includes('accept')).length || 0, color: '#DC2626' },
    { name: 'Autres', value: applications.filter(a => !(a.Status ?? a.status ?? '').toLowerCase().includes('accept')).length || 1, color: '#e2e8f0' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="space-y-1">
        <div className="flex items-center gap-3 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
          <Zap className="w-4 h-4 fill-current" />
          Candidate Performance Hub
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Espace Candidat</h1>
        <p className="text-muted-foreground font-medium max-w-2xl leading-relaxed">
          Visionnez vos statistiques d'entretien et vos résultats de tests techniques en temps réel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Candidatures', value: stats.totalApplications, icon: FileText, color: 'primary' },
          { label: 'Entretiens à venir', value: stats.upcomingInterviews, icon: MessageSquare, color: 'blue' },
          { label: 'Total Entretiens', value: stats.totalInterviews, icon: Calendar, color: 'indigo' },
          { label: 'Tests disponibles', value: stats.availableTests, icon: PlayCircle, color: 'emerald' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform ${
                stat.color === 'primary' ? 'bg-primary/10 text-primary' :
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
        <div className="bg-card border border-border/50 rounded-[3rem] p-8 shadow-xl relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black uppercase tracking-tighter">Statuts Entretiens</h3>
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <div className="h-[300px] relative mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Planifiés', value: stats.totalInterviews, color: '#DC2626' },
                    { name: 'Passés', value: applications.filter(a => (a.Status ?? '').toLowerCase().includes('accept')).length, color: '#e2e8f0' }
                  ]} 
                  cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none"
                >
                  <Cell fill="#DC2626" />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-4xl font-black tracking-tighter">{stats.totalInterviews}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">RDV</p>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
              <span className="text-xs font-bold text-muted-foreground">Interviews</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#e2e8f0]" />
              <span className="text-xs font-bold text-muted-foreground">Autres</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-[3rem] p-8 shadow-xl relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black uppercase tracking-tighter">Statuts Tests</h3>
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <div className="h-[300px] relative mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Complétés', value: stats.completedTests, color: '#DC2626' },
                    { name: 'Disponibles', value: stats.availableTests, color: '#e2e8f0' }
                  ]} 
                  cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none"
                >
                  <Cell fill="#DC2626" />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-4xl font-black tracking-tighter">{stats.completedTests + stats.availableTests}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Tests</p>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
              <span className="text-xs font-bold text-muted-foreground">Fait</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#e2e8f0]" />
              <span className="text-xs font-bold text-muted-foreground">À faire</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Interviews Section */}
      <div className="bg-card border border-border/50 rounded-[3rem] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Mes prochains entretiens</h3>
          </div>
          <button 
            onClick={() => navigate('/my-interviews')}
            className="text-sm font-bold text-primary hover:underline"
          >
            Voir tout
          </button>
        </div>

        <div className="space-y-4">
          {myInterviews.filter(p => (p.IdStatus ?? p.idStatus) < 4).length > 0 ? (
            myInterviews.filter(p => (p.IdStatus ?? p.idStatus) < 4).map((it, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-6 bg-secondary/15 rounded-3xl border border-border/40 gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{it.IdPositionNavigation?.NameStatus ?? it.idPositionNavigation?.nameStatus ?? 'Entretien'}</h4>
                    <p className="text-sm text-muted-foreground font-medium">
                      {it.DatePlanification ? new Date(it.DatePlanification).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Date à confirmer'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <button
                    onClick={() => {
                      if (it.MeetLink || it.meetLink) {
                        navigate(`/interview/${it.RecruitementProcessId || it.recruitementProcessId}`);
                      } else {
                        // Fallback if link is missing
                        alert("Le lien de réunion n'est pas encore prêt. Veuillez rafraîchir la page dans quelques instants ou consulter votre email.");
                      }
                    }}
                    className={`flex-1 md:flex-none h-12 px-8 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                      (it.MeetLink || it.meetLink)
                        ? "bg-red-600 text-white shadow-red-200 hover:bg-red-700"
                        : "bg-secondary text-muted-foreground cursor-not-allowed opacity-70"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    Rejoindre
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-[2rem]">
              <p className="text-muted-foreground font-medium">Aucun entretien prévu pour le moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
