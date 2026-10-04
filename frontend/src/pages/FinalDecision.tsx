import { useState, useEffect } from 'react';
import { Brain, CheckCircle, XCircle, Eye, Sparkles, TrendingUp, TrendingDown, MessageSquare, FileText, ClipboardList, Search, Briefcase, Calendar, Clock, UserPlus, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useApplications } from '../hooks/useApplications';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { api } from '../helpers/apiClient';
import { API_BASE_URL } from '../config';

interface Candidate {
  id: string;
  name: string;
  email: string;
  position: string;
  cvPath: string;
  avatar?: string;
  appDate: string;
  cvScore: number;
  testsScore: number;
  interviewsScore: number;
  overallScore: number;
  status: 'pending' | 'approved' | 'rejected';
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  aiAnalysis: string;
  testResults: {
    completed: number;
    total: number;
    avgScore: number;
  };
  interviewResults: {
    completed: number;
    total: number;
    avgScore: number;
  };
  notes: string[];
}

// Dummy data removed as it is now fetched from the API

// Timeline du candidat : Candidature → Tests → Entretien → Décision (demande encadrante)
type StepState = 'done' | 'partial' | 'rejected' | 'todo';
function stepColors(s: StepState) {
  if (s === 'done') return { dot: 'bg-[#16A34A] text-white border-[#16A34A]', text: 'text-[#16A34A]' };
  if (s === 'partial') return { dot: 'bg-[#EA580C] text-white border-[#EA580C]', text: 'text-[#EA580C]' };
  if (s === 'rejected') return { dot: 'bg-[#DC2626] text-white border-[#DC2626]', text: 'text-[#DC2626]' };
  return { dot: 'bg-secondary text-muted-foreground border-border', text: 'text-muted-foreground' };
}
function CandidateTimeline({ candidate }: { candidate: Candidate }) {
  const prog = (done: number, total: number): StepState =>
    total > 0 ? (done >= total ? 'done' : done > 0 ? 'partial' : 'todo') : 'todo';
  // Libellé clair : effectué / non effectué / en cours — pas juste "0/0 effectués" qui prête à confusion.
  const progLabel = (done: number, total: number) => {
    if (total === 0) return 'Non effectué';
    if (done >= total) return 'Effectué';
    if (done > 0) return `En cours (${done}/${total})`;
    return 'Non effectué';
  };
  const testState = prog(candidate.testResults.completed, candidate.testResults.total);
  const itwState = prog(candidate.interviewResults.completed, candidate.interviewResults.total);
  const decisionState: StepState =
    candidate.status === 'approved' ? 'done' : candidate.status === 'rejected' ? 'rejected' : 'todo';

  const steps = [
    { label: 'Candidature', sub: candidate.appDate ? new Date(candidate.appDate).toLocaleDateString('fr-FR') : 'Reçue', state: 'done' as StepState, Icon: UserPlus },
    { label: 'Tests', sub: progLabel(candidate.testResults.completed, candidate.testResults.total), state: testState, Icon: ClipboardList },
    { label: 'Entretien', sub: progLabel(candidate.interviewResults.completed, candidate.interviewResults.total), state: itwState, Icon: MessageSquare },
    { label: 'Décision', sub: candidate.status === 'approved' ? 'Accepté' : candidate.status === 'rejected' ? 'Refusé' : 'En attente', state: decisionState, Icon: candidate.status === 'rejected' ? XCircle : candidate.status === 'approved' ? CheckCircle : Clock },
  ];

  return (
    <div className="flex mt-2.5 pt-2.5 border-t border-border/60">
      {steps.map((step, i) => {
        const c = stepColors(step.state);
        const StepIcon = step.Icon;
        return (
          <div key={step.label} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : steps[i - 1].state === 'done' ? 'bg-[#16A34A]' : 'bg-border'}`} />
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${c.dot}`}>
                <StepIcon className="w-3 h-3" />
              </div>
              <div className={`h-0.5 flex-1 ${i === steps.length - 1 ? 'bg-transparent' : step.state === 'done' ? 'bg-[#16A34A]' : 'bg-border'}`} />
            </div>
            <p className="text-[10px] font-semibold mt-1 leading-tight">{step.label}</p>
            <p className={`text-[9px] leading-tight ${c.text}`}>{step.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

export function FinalDecision() {
  const { data: apps, loading, refetch } = useApplications();
  const user = useSelector((s: RootState) => s.auth.user);
  const role = (user?.role || user?.Role || '').toString().toLowerCase();
  const isAdmin = role === 'admin';
  // Le RH peut aussi approuver/refuser (comme l'admin)
  const canDecide = isAdmin || role === 'rh' || role === 'hr';
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    if (apps.length > 0) {
      setCandidates(apps.map((app: any) => ({
        id: String(app.applicationId ?? app.ApplicationId ?? app.Id ?? app.id ?? ''),
        name: (app.nameApplication ?? app.NameApplication ?? app.email ?? app.Email ?? '').toString().trim() || 'Candidat',
        email: app.email ?? app.Email ?? app.User?.Email ?? '',
        position: app.jobPosting?.positionTitle ?? app.JobPosting?.positionTitle ?? app.JobPosting?.Title ?? 'Poste',
        cvPath: app.cvPath ?? app.CvPath ?? '',
        appDate: app.applicationDate ?? app.ApplicationDate ?? '',
        cvScore: Number(app.CvScore ?? app.cvScore ?? 0),
        testsScore: Number(app.TestScore ?? app.testScore ?? 0),
        interviewsScore: Number(app.TechScore ?? app.techScore ?? 0),
        overallScore: Number(app.FinalScore ?? app.finalScore ?? 0),
        status: app.IdState === 3 ? 'approved' : app.IdState === 4 ? 'rejected' : 'pending',
        skills: [],
        strengths: (app.Strengths ?? app.strengths ?? '').split(',').filter(Boolean),
        weaknesses: (app.Weaknesses ?? app.weaknesses ?? '').split(',').filter(Boolean),
        aiAnalysis: app.AiAnalysis ?? app.aiAnalysis ?? 'Analyse en cours...',
        testResults: {
          completed: app.TestsCompleted ?? app.testsCompleted ?? 0,
          total: app.TotalTests ?? app.totalTests ?? 0,
          avgScore: Number(app.TestScore ?? app.testScore ?? 0),
        },
        interviewResults: {
          completed: app.InterviewsCompleted ?? app.interviewsCompleted ?? 0,
          total: app.TotalInterviews ?? app.totalInterviews ?? 0,
          avgScore: Number(app.TechScore ?? app.techScore ?? 0),
        },
        notes: (app.Notes ?? app.notes ?? '').split('\n').filter(Boolean),
      })));
    }
  }, [apps]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Filtres supplémentaires (demande encadrante) : recherche, poste, date
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPoste, setFilterPoste] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Liste des postes distincts pour le menu déroulant
  const postes = Array.from(new Set(candidates.map(c => c.position).filter(Boolean))).sort();

  const resetFilters = () => {
    setFilterStatus('all');
    setSearchQuery('');
    setFilterPoste('all');
    setFilterDate('');
  };

  const filteredCandidates = candidates.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterPoste !== 'all' && c.position !== filterPoste) return false;
    if (filterDate && (!c.appDate || c.appDate.slice(0, 10) < filterDate)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q) &&
          !c.email.toLowerCase().includes(q) &&
          !c.position.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hasActiveFilters = filterStatus !== 'all' || filterPoste !== 'all' || !!filterDate || !!searchQuery;

  const handleDecision = async (candidateId: string, decision: 'approved' | 'rejected') => {
    try {
        const newState = decision === 'approved' ? 3 : 4;
        await api.put(`/api/Application/UpdateState/${candidateId}?newState=${newState}`);
        
        setCandidates(candidates.map(c =>
          c.id === candidateId ? { ...c, status: decision } : c
        ));
        toast.success(decision === 'approved' ? 'Candidat approuvé !' : 'Candidat refusé');
        setSelectedCandidate(null);
    } catch (e) {
        toast.error('Erreur lors de la mise à jour de la décision');
    }
  };

  // Suppression définitive du candidat (Admin uniquement) — supprime aussi tests,
  // entretiens, avis et résultats IA liés (cascade gérée côté API).
  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer définitivement ce candidat ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/api/Application/${candidateId}`);
      toast.success('Candidat supprimé définitivement');
      setSelectedCandidate(null);
      refetch();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Télécharge le CV par son NOM DE FICHIER (cvPath), pas par l'id — avec gestion du 404
  const downloadCv = async (candidate: Candidate) => {
    if (!candidate.cvPath) { toast.error('Aucun CV pour ce candidat'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/Application/download/${encodeURIComponent(candidate.cvPath)}`);
      if (!res.ok) { toast.error('CV indisponible pour ce candidat'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Erreur lors du téléchargement du CV');
    }
  };

  // Charge la VRAIE analyse IA (Points Forts / Points d'Attention) du candidat
  const fetchAnalysis = async (candidateId: string) => {
    try {
      const data = await api.get<any>(`/api/Analysis/${candidateId}`);
      if (data?.error) { toast.error(data.error); return; }
      const score = typeof data.matchingScore === 'number' && data.matchingScore > 0 ? Math.round(data.matchingScore) : 0;
      const update = (c: Candidate): Candidate => ({
        ...c,
        cvScore: score || c.cvScore,
        skills: Array.isArray(data.skills) && data.skills.length ? data.skills : c.skills,
        strengths: Array.isArray(data.strengths) && data.strengths.length ? data.strengths : c.strengths,
        weaknesses: Array.isArray(data.weaknesses) && data.weaknesses.length ? data.weaknesses : c.weaknesses,
        aiAnalysis: data.summary || c.aiAnalysis,
      });
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? update(c) : c)));
      setSelectedCandidate((prev) => (prev && prev.id === candidateId ? update(prev) : prev));
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'analyse IA");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Ouvre le modal ET déclenche l'analyse IA réelle en arrière-plan
  const openCandidateAnalysis = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsAnalyzing(true);
    fetchAnalysis(candidate.id);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#16A34A]';
    if (score >= 80) return 'text-[#65A30D]';
    if (score >= 70) return 'text-[#CA8A04]';
    if (score >= 60) return 'text-[#EA580C]';
    return 'text-[#DC2626]';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'from-[#16A34A]/10 to-[#22C55E]/10 border-[#16A34A]/30';
    if (score >= 80) return 'from-[#65A30D]/10 to-[#84CC16]/10 border-[#65A30D]/30';
    if (score >= 70) return 'from-[#CA8A04]/10 to-[#EAB308]/10 border-[#CA8A04]/30';
    if (score >= 60) return 'from-[#EA580C]/10 to-[#F97316]/10 border-[#EA580C]/30';
    return 'from-[#DC2626]/10 to-[#EF4444]/10 border-[#DC2626]/30';
  };

  return (
    <div className="p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Décision Finale IA</h1>
          <p className="text-muted-foreground">
            Analyse complète et décision finale basée sur l'IA
          </p>
        </div>
        <div className="relative flex gap-1 bg-secondary/40 border border-border rounded-xl p-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`relative z-10 px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 ${
                filterStatus === status ? 'text-white' : 'text-foreground hover:text-[#DC2626]'
              }`}
            >
              {filterStatus === status && (
                <motion.span
                  layoutId="finalDecisionStatusPill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 -z-10 bg-[#DC2626] rounded-lg shadow-md shadow-[#DC2626]/20"
                />
              )}
              {status === 'all' ? 'Tous' :
               status === 'pending' ? 'En attente' :
               status === 'approved' ? 'Approuvés' :
               'Refusés'}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="bg-gradient-to-br from-[#DC2626] via-[#EF4444] to-[#F87171] rounded-2xl p-6 text-white shadow-xl cursor-default"
        >
          <Brain className="w-8 h-8 mb-3 opacity-90" />
          <p className="text-3xl font-bold mb-1">{candidates.length}</p>
          <p className="text-sm opacity-90">Total Candidats</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-lg cursor-default"
        >
          <FileText className="w-8 h-8 mb-3 text-[#EA580C]" />
          <p className="text-3xl font-bold mb-1">{candidates.filter(c => c.status === 'pending').length}</p>
          <p className="text-sm text-muted-foreground">En attente</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-lg cursor-default"
        >
          <CheckCircle className="w-8 h-8 mb-3 text-[#16A34A]" />
          <p className="text-3xl font-bold mb-1">{candidates.filter(c => c.status === 'approved').length}</p>
          <p className="text-sm text-muted-foreground">Approuvés</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-lg cursor-default"
        >
          <XCircle className="w-8 h-8 mb-3 text-[#DC2626]" />
          <p className="text-3xl font-bold mb-1">{candidates.filter(c => c.status === 'rejected').length}</p>
          <p className="text-sm text-muted-foreground">Refusés</p>
        </motion.div>
      </div>

      {/* Barre de filtres : recherche + poste + date (demande encadrante) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-card border border-border rounded-2xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un candidat (nom, email, poste)…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-[#DC2626] text-sm"
          />
        </div>
        <div className="relative">
          <Briefcase className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={filterPoste}
            onChange={(e) => setFilterPoste(e.target.value)}
            className="h-10 pl-9 pr-4 rounded-lg bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-[#DC2626] text-sm appearance-none cursor-pointer min-w-[180px]"
          >
            <option value="all">Tous les postes</option>
            {postes.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
        <div className="relative">
          <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            title="Candidatures à partir de cette date"
            className="h-10 pl-9 pr-3 rounded-lg bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-[#DC2626] text-sm cursor-pointer"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="h-10 px-4 rounded-lg bg-secondary/60 hover:bg-secondary text-sm font-medium flex items-center gap-1.5 transition-all"
          >
            <X className="w-4 h-4" /> Réinitialiser
          </button>
        )}
        <span className="text-sm text-muted-foreground whitespace-nowrap lg:ml-auto">
          {filteredCandidates.length} candidat{filteredCandidates.length > 1 ? 's' : ''}
        </span>
      </motion.div>

      <div className="grid grid-cols-1 gap-2.5">
        <AnimatePresence mode="popLayout">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3 overflow-hidden relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/60 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-40 rounded bg-secondary/60 animate-pulse" />
                  <div className="h-2.5 w-56 rounded bg-secondary/40 animate-pulse" />
                </div>
                <div className="h-10 w-16 rounded-lg bg-secondary/50 animate-pulse shrink-0" />
              </div>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: i * 0.1 }}
              />
            </div>
          ))
        ) : filteredCandidates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 text-center text-muted-foreground bg-card border border-dashed border-border rounded-2xl"
          >
            Aucun candidat trouvé.
          </motion.div>
        ) : (
          filteredCandidates.map((candidate, index) => (
          <motion.div
            key={candidate.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="bg-card border border-border rounded-xl p-3 hover:shadow-lg hover:border-[#DC2626]/25 transition-all"
          >
            {/* En-tête compact : avatar + infos + score + actions */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#DC2626] to-[#F87171] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(candidate.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    onClick={() => openCandidateAnalysis(candidate)}
                    className="text-sm font-bold cursor-pointer hover:text-primary transition-colors"
                  >
                    {candidate.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    candidate.status === 'approved' ? 'bg-[#16A34A]/10 text-[#16A34A]' :
                    candidate.status === 'rejected' ? 'bg-[#DC2626]/10 text-[#DC2626]' :
                    'bg-[#EA580C]/10 text-[#EA580C]'
                  }`}>
                    {candidate.status === 'approved' ? 'Approuvé' :
                     candidate.status === 'rejected' ? 'Refusé' :
                     'En attente'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{candidate.position} · {candidate.email}</p>
                <div className="flex items-center gap-2.5 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-primary" />CV {candidate.cvScore.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%</span>
                  <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3 text-primary" />Tests {candidate.testsScore.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-primary" />Entretiens {candidate.interviewsScore.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className={`bg-gradient-to-br ${getScoreBg(candidate.overallScore)} border-2 rounded-lg px-2.5 py-1 text-center min-w-[60px]`}>
                  <div className={`text-base font-bold leading-tight ${getScoreColor(candidate.overallScore)}`}>
                    {candidate.overallScore}%
                  </div>
                  <p className="text-[8px] text-muted-foreground leading-tight">Score IA</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => openCandidateAnalysis(candidate)}
                    className="h-6 px-2 bg-gradient-to-r from-[#DC2626] to-[#F87171] text-white rounded-md text-[10px] font-semibold hover:shadow-lg transition-all flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Analyse
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadCv(candidate); }}
                      className="h-6 px-2 flex-1 bg-card border border-border rounded-md text-[10px] font-medium hover:bg-secondary transition-all flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3 h-3" /> CV
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCandidate(candidate.id); }}
                        title="Supprimer définitivement"
                        className="h-6 w-6 flex items-center justify-center bg-red-500/10 text-red-600 rounded-md hover:bg-red-500 hover:text-white transition-all shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline du candidat (étapes passées + statut final) */}
            <CandidateTimeline candidate={candidate} />

            {/* Décision (compacte) */}
            {canDecide && candidate.status === 'pending' && (
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDecision(candidate.id, 'approved'); }}
                  className="flex-1 h-7 bg-[#16A34A] text-white rounded-md text-xs font-medium hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approuver
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDecision(candidate.id, 'rejected'); }}
                  className="flex-1 h-7 bg-error text-white rounded-md text-xs font-medium hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Refuser
                </button>
              </div>
            )}
          </motion.div>
        )))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
      {selectedCandidate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCandidate(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#F87171] text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {(selectedCandidate.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedCandidate.name}</h2>
                  <p className="text-muted-foreground">{selectedCandidate.position}</p>
                </div>
              </div>
              <div className={`bg-gradient-to-br ${getScoreBg(selectedCandidate.overallScore)} border-2 rounded-xl p-4 text-center`}>
                <div className={`text-3xl font-bold ${getScoreColor(selectedCandidate.overallScore)}`}>
                  {selectedCandidate.overallScore}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Score IA</p>
              </div>
            </div>

            {/* Timeline du candidat : entretien effectué ou non, statut final */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-secondary/20 border border-border/60 rounded-xl p-4 mb-6"
            >
              <CandidateTimeline candidate={selectedCandidate} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Analyse IA</h3>
                {isAnalyzing && <Sparkles className="w-4 h-4 text-primary animate-pulse ml-auto" />}
              </div>
              {isAnalyzing ? (
                <p className="text-sm text-muted-foreground animate-pulse">Analyse IA en cours…</p>
              ) : (
                <p className="text-sm leading-relaxed">{selectedCandidate.aiAnalysis}</p>
              )}
            </motion.div>

            {/* Compétences détectées par l'IA */}
            {selectedCandidate.skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-6"
              >
                <h3 className="text-sm font-semibold mb-3">Compétences détectées</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((skill, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 + idx * 0.03 }}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-4 mb-6"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                  <h3 className="text-sm font-semibold">Points Forts</h3>
                </div>
                <div className="space-y-2">
                  {selectedCandidate.strengths.slice(0, 3).map((strength, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-lg">
                      <CheckCircle className="w-3 h-3 text-[#16A34A] mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-[#EA580C]" />
                  <h3 className="text-sm font-semibold">Points d'Attention</h3>
                </div>
                <div className="space-y-2">
                  {selectedCandidate.weaknesses.slice(0, 3).map((weakness, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-[#EA580C]/5 border border-[#EA580C]/20 rounded-lg">
                      <XCircle className="w-3 h-3 text-[#EA580C] mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{weakness}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="flex flex-wrap gap-4 justify-between pt-6 border-t border-border mt-auto">
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCv(selectedCandidate)}
                  className="h-11 px-5 bg-card border border-border text-foreground rounded-xl font-bold hover:bg-secondary active:scale-95 transition-all flex items-center gap-2 shadow-sm"
                >
                  <FileText className="w-4 h-4 text-primary" />
                  Télécharger le CV
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteCandidate(selectedCandidate.id)}
                    className="h-11 px-5 bg-red-500/10 text-red-600 rounded-xl font-bold hover:bg-red-500 hover:text-white active:scale-95 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="h-11 px-6 bg-secondary/50 text-secondary-foreground rounded-xl font-bold hover:bg-secondary active:scale-95 transition-all shadow-sm"
                >
                  Fermer
                </button>
                {canDecide && selectedCandidate.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleDecision(selectedCandidate.id, 'rejected')}
                      className="h-11 px-6 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Refuser
                    </button>
                    <button
                      onClick={() => handleDecision(selectedCandidate.id, 'approved')}
                      disabled={selectedCandidate.overallScore < 75}
                      className={`h-11 px-6 rounded-xl font-bold transition-all flex items-center gap-2 ${
                        selectedCandidate.overallScore >= 75
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg active:scale-95'
                        : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                      }`}
                      title={selectedCandidate.overallScore < 75 ? "Score insuffisant (min 75%)" : "Approuver le candidat"}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approuver
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
