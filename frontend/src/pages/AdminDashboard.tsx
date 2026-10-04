import { useState } from 'react';
import { Users, Settings, FileQuestion, Calendar, Plus, Edit, Trash2, Search, Shield, Eye, CheckCircle, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { toast } from 'sonner';
import { useUsers } from '../hooks/useUsers';
import { useInterviews } from '../hooks/useInterviews';
import { useJobPostings } from '../hooks/useJobPostings';
import { useQuestions } from '../hooks/useQuestions';
import { useApplications } from '../hooks/useApplications';
import { useMemo } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'rh' | 'team_leader' | 'candidate';
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'code' | 'essay';
  category: string;
  points: number;
}

interface InterviewTemplate {
  id: string;
  name: string;
  type: 'rh' | 'technique' | 'final';
  duration: number;
  questions: number;
  scheduledDate?: string;
  scheduledTime?: string;
  candidateName?: string;
  status?: 'planifié' | 'annulé' | 'complété';
}

// Dummy data removed as it is now fetched from the API


type ManagementView = 'users' | 'questions' | 'interviews';

export function AdminDashboard() {
  const [activeView, setActiveView] = useState<ManagementView>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { data: usersData, loading: usersLoading, error: usersError } = useUsers();
  const { data: interviewsData, loading: interviewsLoading, error: interviewsError } = useInterviews();
  const { data: jobPostingsData, loading: jobPostingsLoading, error: jobPostingsError } = useJobPostings();
  const { data: questionsData, loading: questionsLoading, error: questionsError } = useQuestions();
  const { data: appsData, loading: appsLoading, error: appsError } = useApplications();

  // Data processing for charts
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const counts = new Array(12).fill(0);
    
    (Array.isArray(appsData) ? appsData : []).forEach((app: any) => {
      const date = new Date(app.ApplicationDate || app.applicationDate);
      if (!isNaN(date.getTime())) {
        counts[date.getMonth()]++;
      }
    });

    return months.map((month, idx) => ({
      name: month,
      candidatures: counts[idx]
    }));
  }, [appsData]);

  const appStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {
      'En cours': 0,
      'Accepté': 0,
      'Refusé': 0
    };

    (Array.isArray(appsData) ? appsData : []).forEach((app: any) => {
      const status = app.IdStateNavigation?.NameState || app.idStateNavigation?.nameState || 'En cours';
      if (status.toLowerCase().includes('accept')) statusCounts['Accepté']++;
      else if (status.toLowerCase().includes('refus')) statusCounts['Refusé']++;
      else statusCounts['En cours']++;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [appsData]);

  const interviewStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {
      'Planifié': 0,
      'En cours': 0,
      'Terminé': 0
    };

    (Array.isArray(interviewsData) ? interviewsData : []).forEach((it: any) => {
      const status = it.IdStatusNavigation?.NameStatus || it.idStatusNavigation?.nameStatus || 'Planifié';
      if (status.toLowerCase().includes('complet') || status.toLowerCase().includes('terminé')) statusCounts['Terminé']++;
      else if (status.toLowerCase().includes('encours') || status.toLowerCase().includes('progress')) statusCounts['En cours']++;
      else statusCounts['Planifié']++;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [interviewsData]);

  const COLORS = ['#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#2563EB'];

  const usersList: User[] = (Array.isArray(usersData) ? usersData : []).map((u: any) => ({
    id: String(u.UserId ?? u.userId ?? u.Id ?? u.id ?? ''),
    name: `${u.Name ?? u.name ?? ''} ${u.Prename ?? u.prename ?? ''}`.trim() || u.Username || u.username || 'Unknown',
    email: u.Email ?? u.email ?? '',
    role: String(u.Role?.Description ?? u.Role?.description ?? u.Role ?? u.role ?? 'candidate').toLowerCase() as User['role'],
    status: (u.Etat ?? u.etat ?? true) ? 'active' : 'inactive',
    createdAt: u.CreatedAt ?? u.createdAt ?? new Date().toISOString(),
  }));

  const questionsList: Question[] = (Array.isArray(questionsData) ? questionsData : []).map((q: any, idx: number) => ({
    id: String(q.QuestionId ?? q.questionId ?? q.Id ?? q.id ?? idx),
    text: q.Question1 ?? q.question1 ?? q.Text ?? q.text ?? q.Content ?? q.content ?? 'Sans titre',
    type: (q.Type ?? q.type ?? 'essay').toString().toLowerCase() as Question['type'],
    category: q.Section?.Name ?? q.Section?.name ?? q.Category ?? q.category ?? 'Général',
    points: Number(q.Points ?? q.points ?? 1),
  }));

  const templatesList: InterviewTemplate[] = (Array.isArray(interviewsData) ? interviewsData : []).map((it: any, idx: number) => {
    const get = (obj: any, key: string) => obj?.[key] ?? obj?.[key.charAt(0).toLowerCase() + key.slice(1)];
    const app = get(it, 'Application');
    const user = get(app, 'User');
    const statusNav = get(it, 'IdStatusNavigation');

    return {
      id: String(get(it, 'RecruitementProcessId') ?? get(it, 'Id') ?? idx),
      name: get(app, 'NameApplication') || get(user, 'Username') || get(user, 'Name') || get(it, 'CandidateName') || 'Candidat',
      type: 'technique',
      duration: Number(get(it, 'Duration') || 60),
      questions: Number(get(it, 'QuestionCount') || 0),
      scheduledDate: (get(it, 'DatePlanification') || get(it, 'Date') || get(it, 'ScheduledDate') || new Date().toISOString()).split('T')[0],
      scheduledTime: get(it, 'Time') || get(it, 'ScheduledTime') || '10:00',
      candidateName: get(app, 'NameApplication') || get(user, 'Username') || get(user, 'Name') || get(it, 'CandidateName') || 'Candidat',
      status: (get(statusNav, 'StatusDescription') || 'planifié').toString().toLowerCase().includes('cancel')
        ? 'annulé'
        : (get(statusNav, 'StatusDescription') || '').toString().toLowerCase().includes('complete')
          ? 'complété'
          : 'planifié',
    };
  });

  if (usersLoading || interviewsLoading || jobPostingsLoading || questionsLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const errorMessage = usersError || interviewsError || jobPostingsError || questionsError;
  if (errorMessage) {
    return <div className="p-8 text-error">{errorMessage}</div>;
  }

  const handleCreate = (type: ManagementView) => {
    setModalType('create');
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setModalType('edit');
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDelete = (id: string, type: ManagementView) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      toast.success('Élément supprimé avec succès');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrateur',
      rh: 'RH',
      team_leader: 'Team Leader',
      candidate: 'Candidat',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-[#DC2626] text-white',
      rh: 'bg-[#EA580C] text-white',
      team_leader: 'bg-[#CA8A04] text-white',
      candidate: 'bg-secondary text-muted-foreground',
    };
    return colors[role] || 'bg-secondary text-muted-foreground';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Administration</h1>
        <p className="text-muted-foreground text-base">
          Gestion complète des utilisateurs, questions et entretiens
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#DC2626] via-[#EF4444] to-[#F87171] rounded-3xl p-6 text-white shadow-xl cursor-pointer"
          onClick={() => setActiveView('users')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold mb-2">{usersList.length}</p>
            <p className="text-sm opacity-90">Utilisateurs</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer"
          onClick={() => setActiveView('questions')}
        >
          <div className="w-12 h-12 bg-[#DC2626]/10 rounded-xl flex items-center justify-center mb-4">
            <FileQuestion className="w-6 h-6 text-[#DC2626]" />
          </div>
          <p className="text-3xl font-bold mb-2 text-[#DC2626]">{questionsList.length}</p>
          <p className="text-sm text-muted-foreground">Questions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer"
          onClick={() => setActiveView('interviews')}
        >
          <div className="w-12 h-12 bg-[#DC2626]/10 rounded-xl flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-[#DC2626]" />
          </div>
          <p className="text-3xl font-bold mb-2 text-[#DC2626]">{templatesList.filter(t => t.status !== 'complété').length}</p>
          <p className="text-sm text-muted-foreground">Entretiens Planifiés</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer"
          onClick={() => setActiveView('interviews')}
        >
          <div className="w-12 h-12 bg-[#16A34A]/10 rounded-xl flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-[#16A34A]" />
          </div>
          <p className="text-3xl font-bold mb-2 text-[#16A34A]">{templatesList.filter(t => t.status === 'complété').length}</p>
          <p className="text-sm text-muted-foreground">Entretiens Terminés</p>
        </motion.div>
      </div>

      {/* Modern Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart: Evolution Monthly */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black tracking-tight">Évolution Candidatures</h3>
              <p className="text-sm text-muted-foreground font-medium">Volume mensuel des nouveaux candidats</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorCandidatures" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="candidatures" 
                  stroke="#DC2626" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorCandidatures)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Charts Grid: Donut & Pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Donut Chart: Application Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-[2.5rem] p-6 shadow-xl"
          >
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Statut Candidats
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {appStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Pie Chart: Interview Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-[2.5rem] p-6 shadow-xl"
          >
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Statut Entretiens
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={interviewStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    labelLine={false}
                  >
                    {interviewStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Management Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'users', label: 'Utilisateurs', icon: Users },
          { id: 'questions', label: 'Questions', icon: FileQuestion },
          { id: 'interviews', label: 'Entretiens', icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as ManagementView)}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all border-b-2 ${
              activeView === tab.id
                ? 'border-[#DC2626] text-[#DC2626]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Rechercher ${activeView === 'users' ? 'un utilisateur' : activeView === 'questions' ? 'une question' : 'un template'}...`}
              className="w-full h-12 pl-11 pr-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => handleCreate(activeView)}
            className="h-12 px-6 bg-gradient-to-r from-[#DC2626] to-[#F87171] text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Créer
          </button>
        </div>

        {/* Users Management */}
        {activeView === 'users' && (
          <div className="space-y-4">
            {usersList.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#F87171] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{user.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'active' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {user.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Rôle:</label>
                        <select
                          value={user.role}
                          onChange={(e) => {
                            toast.success(`Rôle changé en ${getRoleLabel(e.target.value)}`);
                          }}
                          className="h-8 px-3 bg-input-background border border-input rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="admin">Administrateur</option>
                          <option value="rh">RH</option>
                          <option value="team_leader">Team Leader</option>
                          <option value="candidate">Candidat</option>
                        </select>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Créé le {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="h-10 w-10 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, 'users')}
                      className="h-10 w-10 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Questions Management */}
        {activeView === 'questions' && (
          <div className="grid grid-cols-1 gap-4">
            {questionsList.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-[#DC2626]/10 text-[#DC2626] rounded-full text-xs font-semibold">
                        {question.type.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 bg-secondary text-muted-foreground rounded-full text-xs font-semibold">
                        {question.category}
                      </span>
                      <span className="px-3 py-1 bg-gradient-to-r from-[#DC2626]/10 to-[#F87171]/10 text-[#DC2626] rounded-full text-xs font-semibold">
                        {question.points} points
                      </span>
                    </div>
                    <p className="font-medium text-lg mb-2">{question.text}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(question)}
                      className="h-10 w-10 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(question.id, 'questions')}
                      className="h-10 w-10 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Interview Templates Management */}
        {activeView === 'interviews' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templatesList.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#F87171] flex items-center justify-center text-white shadow-sm">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 bg-gradient-to-r from-[#DC2626]/10 to-[#F87171]/10 text-[#DC2626] rounded-full text-xs font-semibold">
                    {template.type.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-bold mb-2">{template.name}</h3>
                {template.candidateName && (
                  <p className="text-sm text-muted-foreground mb-3">Candidat: {template.candidateName}</p>
                )}
                {template.status && (
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                    template.status === 'planifié' ? 'bg-[#EA580C]/10 text-[#EA580C]' :
                    template.status === 'annulé' ? 'bg-error/10 text-error' :
                    'bg-[#16A34A]/10 text-[#16A34A]'
                  }`}>
                    {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
                  </span>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <p className="text-muted-foreground mb-1">Durée</p>
                    <p className="font-semibold">{template.duration} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Questions</p>
                    <p className="font-semibold">{template.questions}</p>
                  </div>
                </div>
                {template.scheduledDate && (
                  <div className="text-xs mb-4 p-2 bg-secondary/30 rounded-lg">
                    <p className="text-muted-foreground mb-1">Date planifiée</p>
                    <p className="font-semibold">
                      {new Date(template.scheduledDate).toLocaleDateString('fr-FR')} à {template.scheduledTime}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex-1 h-10 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(template.id, 'interviews')}
                    className="h-10 w-10 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-all flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-8 max-w-2xl w-full"
            >
              <h2 className="text-2xl font-bold mb-6">
                {modalType === 'create' ? 'Créer' : 'Modifier'} {
                  activeView === 'users' ? 'un utilisateur' :
                  activeView === 'questions' ? 'une question' :
                  'un template d\'entretien'
                }
              </h2>

              {activeView === 'users' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom complet</label>
                    <input
                      type="text"
                      placeholder="Ex: Marie Dupont"
                      defaultValue={selectedItem?.name}
                      className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="Ex: marie.dupont@company.com"
                      defaultValue={selectedItem?.email}
                      className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rôle</label>
                    <select
                      defaultValue={selectedItem?.role}
                      className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="admin">Administrateur</option>
                      <option value="rh">RH</option>
                      <option value="team_leader">Team Leader</option>
                      <option value="candidate">Candidat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Statut</label>
                    <select
                      defaultValue={selectedItem?.status}
                      className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                </div>
              )}

              {activeView === 'questions' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Question</label>
                    <textarea
                      placeholder="Ex: Expliquez le concept de closure en JavaScript"
                      defaultValue={selectedItem?.text}
                      className="w-full h-24 px-4 py-3 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Type</label>
                      <select
                        defaultValue={selectedItem?.type}
                        className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="mcq">QCM</option>
                        <option value="code">Code</option>
                        <option value="essay">Rédaction</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Catégorie</label>
                      <input
                        type="text"
                        placeholder="Ex: JavaScript"
                        defaultValue={selectedItem?.category}
                        className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Points</label>
                      <input
                        type="number"
                        placeholder="10"
                        defaultValue={selectedItem?.points}
                        className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'interviews' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom de l'entretien</label>
                    <input
                      type="text"
                      placeholder="Ex: Entretien RH Standard"
                      defaultValue={selectedItem?.name}
                      className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Type</label>
                      <select
                        defaultValue={selectedItem?.type}
                        className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="rh">RH</option>
                        <option value="technique">Technique</option>
                        <option value="final">Final</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Durée (min)</label>
                      <input
                        type="number"
                        placeholder="60"
                        defaultValue={selectedItem?.duration}
                        className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nombre de questions</label>
                    <input
                      type="number"
                      placeholder="10"
                      defaultValue={selectedItem?.questions}
                      className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Candidat (optionnel)</label>
                    <input
                      type="text"
                      placeholder="Nom du candidat"
                      defaultValue={selectedItem?.candidateName}
                      className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date planifiée</label>
                      <input
                        type="date"
                        defaultValue={selectedItem?.scheduledDate}
                        className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Heure</label>
                      <input
                        type="time"
                        defaultValue={selectedItem?.scheduledTime}
                        className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Statut</label>
                    <select
                      defaultValue={selectedItem?.status || 'planifié'}
                      className="w-full h-12 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="planifié">Planifié</option>
                      <option value="annulé">Annulé</option>
                      <option value="complété">Complété</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="h-12 px-6 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    toast.success(modalType === 'create' ? 'Élément créé avec succès' : 'Élément modifié avec succès');
                    setShowModal(false);
                  }}
                  className="h-12 px-6 bg-[#DC2626] text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all"
                >
                  {modalType === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
