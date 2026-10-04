import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  ClipboardList,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  MessageCircle,
  X,
  Plus,
  Edit2,
  ExternalLink,
  Star,
  Zap,
  Download,
  ArrowLeft,
  Video,
  Sparkles,
  Brain,
  MessageSquare,
  Trash2,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../redux/store';

import { toast } from 'sonner';
import { useApplications } from '../hooks/useApplications';
import { useSessions } from '../hooks/useSessions';
import { useInterviews } from '../hooks/useInterviews';
import { usePipeline } from '../hooks/usePipeline';
import { api } from '../helpers/apiClient';
import { getDeptAvatar } from '../util/avatarHelper';
import { API_BASE_URL } from '../config';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  location: string;
  appliedDate: string;
  status: 'en_cours' | 'pending' | 'termine';
  experience: string;
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  cvScore: number;
  analysis?: string;
  testsCompleted: number;
  totalTests: number;
  interviewsCompleted: number;
  totalInterviews: number;
  avatar?: string;
  isRecommended?: boolean;
  hrScore?: number;
  techScore?: number;
  testScore?: number;
  adminDecision?: string;
  cvPath?: string;
  assignedTeamLeaderId?: number;
  assignedTeamLeader?: {
    name: string;
    prename: string;
    email: string;
  };
}

export function TeamLeaderCandidates() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const role = (user?.role || user?.Role || '').toString().toLowerCase();
  const isHR = role === 'rh' || role === 'hr';
  const isAdmin = role === 'admin';
  const isTL = role === 'team leader' || role === 'teamleader' || role === 'tl';

  const tlId = isTL ? (user?.userId || user?.UserId || user?.id) : undefined;

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { data: applicationsData, total, loading, refetch: refetchApps } = useApplications(currentPage, pageSize, tlId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_cours' | 'pending' | 'termine'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  // Aperçu du CV directement dans l'app (au lieu de le télécharger)
  const [showCvViewer, setShowCvViewer] = useState(false);
  const [cvViewerUrl, setCvViewerUrl] = useState<string | null>(null);
  const [cvViewerIsPdf, setCvViewerIsPdf] = useState(true);
  const [cvViewerLoading, setCvViewerLoading] = useState(false);
  const [cvViewerDownloadUrl, setCvViewerDownloadUrl] = useState<string | null>(null);

  const viewCvInApp = async (cvPath?: string) => {
    if (!cvPath) { toast.error('Aucun CV n\'est disponible pour ce candidat'); return; }
    setShowCvViewer(true);
    setCvViewerLoading(true);
    setCvViewerUrl(null);
    try {
      const downloadUrl = `${API_BASE_URL}/api/Application/download/${encodeURIComponent(cvPath)}`;
      const res = await fetch(downloadUrl);
      if (!res.ok) { toast.error('CV indisponible pour ce candidat'); setShowCvViewer(false); return; }
      const blob = await res.blob();
      const isPdf = blob.type === 'application/pdf' || cvPath.toLowerCase().endsWith('.pdf');
      setCvViewerIsPdf(isPdf);
      setCvViewerDownloadUrl(downloadUrl);
      setCvViewerUrl(URL.createObjectURL(blob));
    } catch {
      toast.error('Erreur lors du chargement du CV');
      setShowCvViewer(false);
    } finally {
      setCvViewerLoading(false);
    }
  };
  const closeCvViewer = () => {
    if (cvViewerUrl) URL.revokeObjectURL(cvViewerUrl);
    setShowCvViewer(false);
    setCvViewerUrl(null);
    setCvViewerDownloadUrl(null);
  };

  // Ouvre la fiche candidat ET charge la vraie analyse IA (compétences, score, résumé)
  const openCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    api.get<any>(`/api/Analysis/${candidate.id}`)
      .then((data) => {
        if (!data || data.error) return;
        setSelectedCandidate((prev) => (prev && prev.id === candidate.id ? {
          ...prev,
          skills: Array.isArray(data.skills) && data.skills.length ? data.skills : prev.skills,
          strengths: Array.isArray(data.strengths) && data.strengths.length ? data.strengths : prev.strengths,
          weaknesses: Array.isArray(data.weaknesses) && data.weaknesses.length ? data.weaknesses : prev.weaknesses,
          cvScore: typeof data.matchingScore === 'number' && data.matchingScore > 0 ? Math.round(data.matchingScore) : prev.cvScore,
          analysis: data.summary || prev.analysis,
        } : prev));
      })
      .catch(() => {});
  };
  const [activeTab, setActiveTab] = useState<'profil' | 'tests' | 'entretiens' | 'timeline'>('profil');
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [viewInterviewDetails, setViewInterviewDetails] = useState<any | null>(null);
  const [editingInterview, setEditingInterview] = useState<any | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [checklistChecked, setChecklistChecked] = useState<Record<number, boolean>>({});
  const [checklistDone, setChecklistDone] = useState(false);
  const [showEmojiRating, setShowEmojiRating] = useState(false);
  const [selectedForEval, setSelectedForEval] = useState<any | null>(null);
  const [evalType, setEvalType] = useState<'interview' | 'test'>('interview');
  const [evalDuration, setEvalDuration] = useState('');
  const [evalQuestions, setEvalQuestions] = useState('');
  const [evalNotes, setEvalNotes] = useState('');
  const [newInterview, setNewInterview] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    type: 'technique',
    stepId: '',
    meetLink: ''
  });
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [teamLeaders, setTeamLeaders] = useState<any[]>([]);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const { data: sessions, loading: sessionsLoading, refetch: refetchSessions } = useSessions(selectedCandidate ? parseInt(selectedCandidate.id) : undefined);
  const { data: allInterviews, loading: interviewsLoading, refetch } = useInterviews();
  const { data: pipelineSteps } = usePipeline();

  const candidateInterviews = useMemo(() => {
    if (!selectedCandidate || !allInterviews) return [];
    return allInterviews.filter((i: any) =>
      String(i.applicationId) === selectedCandidate.id ||
      String(i.ApplicationId) === selectedCandidate.id
    );
  }, [selectedCandidate, allInterviews]);

  // Score TL : moyenne des notes d'entretien (EvaNote) données par le Team Leader assigné au candidat
  const tlScore = useMemo(() => {
    if (!selectedCandidate?.assignedTeamLeaderId) return 0;
    const notes = candidateInterviews
      .filter((i: any) => (i.userId ?? i.UserId) === selectedCandidate.assignedTeamLeaderId)
      .map((i: any) => i.evaNote ?? i.EvaNote)
      .filter((n: any) => typeof n === 'number');
    if (notes.length === 0) return 0;
    return notes.reduce((a: number, b: number) => a + b, 0) / notes.length;
  }, [selectedCandidate, candidateInterviews]);

  const candidates: Candidate[] = useMemo(() => {
    return (Array.isArray(applicationsData) ? applicationsData : []).map((app: any) => {
      const get = (obj: any, key: string) => obj?.[key] ?? obj?.[key.charAt(0).toLowerCase() + key.slice(1)];

      const user = get(app, 'User');
      const job = get(app, 'JobPosting');
      const stateNav = get(app, 'IdStateNavigation');

      const firstName = get(user, 'Name') ?? '';
      const lastName = get(user, 'Prename') ?? '';
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        id: String(get(app, 'ApplicationId') ?? get(app, 'Id') ?? ''),
        name: get(app, 'NameApplication') || fullName || 'Candidat Anonyme',
        email: get(app, 'Email') || get(user, 'Email') || '',
        phone: get(app, 'PhoneNumber')?.toString() || get(user, 'Telephone') || get(user, 'Phone') || '',
        position: get(job, 'PositionTitle') || get(job, 'Title') || 'Poste non défini',
        location: get(user, 'Adresse') || get(user, 'Address') || 'Non localisé',
        appliedDate: get(app, 'ApplicationDate') || get(app, 'DateApplication') || new Date().toISOString(),
        status: (() => {
          const idState = Number(get(app, 'IdState') || get(app, 'idState') || 1);
          switch (idState) {
            case 1: return 'en attente';
            case 2: return 'acceptés';
            case 3: return 'en cours';
            case 4: return 'refusés';
            default: return 'en attente';
          }
        })(),
        experience: get(app, 'Experience') || 'N/A',
        skills: (get(app, 'Skills') || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        strengths: (get(app, 'Strengths') || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        weaknesses: (get(app, 'Weaknesses') || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        cvScore: Number(get(app, 'CvScore') || 0),
        testsCompleted: Number(get(app, 'TestsCompleted') || 0),
        totalTests: Number(get(app, 'TotalTests') || 0),
        interviewsCompleted: Number(get(app, 'InterviewsCompleted') || 0),
        totalInterviews: Number(get(app, 'TotalInterviews') || 0),
        avatar: get(user, 'Avatar'),
        isRecommended: get(app, 'IsRecommended') || false,
        hrScore: Number(get(app, 'HrScore') || 0),
        techScore: Number(get(app, 'TechScore') || 0),
        testScore: Number(get(app, 'TestScore') || 0),
        interviewScore: Number(get(app, 'InterviewScore') || 0),
        finalScore: Number(get(app, 'FinalScore') || 0),
        adminDecision: get(app, 'AdminDecision') || 'Pending',
        cvPath: get(app, 'CvPath') || get(app, 'cvPath') || '',
        assignedTeamLeaderId: get(app, 'AssignedTeamLeaderId'),
        assignedTeamLeader: get(app, 'AssignedTeamLeader'),
      };
    });
  }, [applicationsData]);

  const dispatch = useDispatch();



  useEffect(() => {
    if (selectedCandidate) {
      const updated = candidates.find(c => c.id === selectedCandidate.id);
      if (updated) setSelectedCandidate(updated);
      else setSelectedCandidate(null); // If deleted
    }
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en cours': return 'bg-blue-500';
      case 'acceptés': return 'bg-emerald-500';
      case 'refusés': return 'bg-red-500';
      default: return 'bg-amber-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { 'en attente': 'En attente', 'en cours': 'En cours', 'refusés': 'Refusés', 'acceptés': 'Acceptés' };
    return labels[status] || status;
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();


  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      const user = JSON.parse(localStorage.getItem('tricareer_user') || '{}');
      const payload = {
        recruitementProcess: {
          applicationId: parseInt(selectedCandidate.id),
          idPosition: parseInt(newInterview.stepId),
          idStatus: 2,
          datePlanification: `${newInterview.date}T${newInterview.time}:00`,
          userId: user.Id || user.id || user.userId,
          meetLink: newInterview.meetLink
        },
        idExamen: 0
      };

      if (editingInterview) {
        await api.put(`/api/RecruitementProcess`, {
          ...editingInterview,
          idPosition: parseInt(newInterview.stepId),
          datePlanification: payload.recruitementProcess.datePlanification,
          meetLink: newInterview.meetLink
        });
        toast.success('Entretien mis à jour');
      } else {
        await api.post('/api/RecruitementProcess', payload);
        toast.success('Entretien planifié avec succès');
      }

      setShowAddInterview(false);
      setEditingInterview(null);
      // Rafraîchit les données sans recharger la page (garde le candidat sélectionné affiché)
      refetchApps();
      refetch();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const startEditInterview = (interview: any) => {
    setEditingInterview(interview);
    const datePlan = interview.datePlanification || interview.DatePlanification;
    const date = datePlan ? datePlan.split('T')[0] : new Date().toISOString().split('T')[0];
    const time = datePlan ? datePlan.split('T')[1].substring(0, 5) : '10:00';

    setNewInterview({
      date,
      time,
      type: 'technique',
      stepId: String(interview.idPosition || interview.IdPosition || ''),
      meetLink: interview.meetLink || interview.MeetLink || ''
    });
    setShowAddInterview(true);
  };

  const fetchSessionDetails = async (session: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // If we are about to open the evaluate modal, don't show the details modal
    if (showChecklist || showEmojiRating || selectedForEval || showAssignModal) return;

    // Close other modals first
    setShowAddInterview(false);
    setViewInterviewDetails(null);
    setShowAssignModal(false);
    setSessionDetails(null);

    setSelectedSession(session);
    setLoadingDetails(true);
    try {
      const sessionId = session.sessionId || session.SessionId || session.id;
      const res = await api.get(`/api/Sessions/result/${sessionId}`);
      setSessionDetails(res);
    } catch (e) {
      toast.error('Erreur lors du chargement des réponses');
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchAvailableTests = async () => {
    try {
      const res = await api.get('/api/Examans');
      setAvailableTests(res);
    } catch (e) {
      toast.error('Erreur lors du chargement des tests');
    }
  };

  const handleAssignTest = async (examId: number) => {
    if (!selectedCandidate) return;
    setIsAssigning(true);
    try {
      const res: any = await api.post('/api/Sessions', {
        applicationId: parseInt(selectedCandidate.id),
        examanId: examId,
        deadline: new Date(Date.now() + 86400000 * 7).toISOString() // 7 days default
      });
      if (res?.emailSent === false) {
        toast.warning(`Test assigné, mais l'email n'a pas pu être envoyé au candidat${res?.emailError ? ` (${res.emailError})` : ''}`);
      } else {
        toast.success('Test assigné avec succès — email envoyé au candidat');
      }
      setShowAssignModal(false);
      // Rafraîchit les données sans recharger la page (garde le candidat sélectionné affiché)
      refetchApps();
      refetchSessions();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsAssigning(false);
    }
  };

  const fetchTeamLeaders = async () => {
    try {
      const res = await api.get('/api/Users');
      // Filter for Team Leaders
      const tls = res.filter((u: any) => {
        const r = (u.role?.description || u.Role?.Description || '').toLowerCase();
        return r.includes('team leader') || r.includes('teamleader');
      });
      setTeamLeaders(tls);
    } catch (e) {
      toast.error('Erreur lors du chargement des Team Leaders');
    }
  };

  const handleReassign = async (tlId: number) => {
    if (!selectedCandidate) return;
    setIsReassigning(true);
    try {
      await api.put(`/api/Application/reassign/${selectedCandidate.id}/${tlId}`);
      toast.success('Candidat réassigné avec succès');
      setShowReassignModal(false);
      refetchApps();
    } catch (e) {
      toast.error('Erreur lors de la réassignation');
    } finally {
      setIsReassigning(false);
    }
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer ce test ?')) return;
    try {
      await api.delete(`/api/Sessions/${sessionId}`);
      toast.success('Test supprimé');
      refetchSessions();
      refetchApps();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleOpenChecklist = async (session: any) => {
    // Close other modals first to prevent overlap
    setSessionDetails(null);
    setSelectedSession(null);
    setShowAddInterview(false);
    setViewInterviewDetails(null);
    setShowAssignModal(false);

    setSelectedForEval(session);
    setEvalType('test');
    try {
      const title = session.examen?.titre || session.Examen?.Titre || '';
      const res = await api.get(`/api/TestChecklist?category=${encodeURIComponent(title)}`);
      setChecklistItems(res);
      setShowChecklist(true);
    } catch (e) {
      toast.error('Erreur lors du chargement de la checklist');
    }
  };

  const formatDuration = (minutes: string | number) => {
    const m = parseInt(String(minutes));
    if (isNaN(m)) return 'N/A';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h${rem.toString().padStart(2, '0')}` : `${h}h`;
  };

  const handleSaveEvaluation = async (ratingOrScore: number) => {
    try {
      if (evalType === 'interview') {
        let formattedComment = `[SCORE]: ${ratingOrScore * 20}`;
        if (evalDuration) formattedComment += `\n[DURATION]: ${evalDuration}`;
        if (evalQuestions) formattedComment += `\n[QUESTIONS]: ${evalQuestions}`;
        if (evalNotes) formattedComment += `\n[NOTES]: ${evalNotes}`;
        await api.put(`/api/RecruitementProcess`, {
          ...selectedForEval,
          evaNote: ratingOrScore * 20,
          evaCommentaire: formattedComment,
          idStatus: 4
        });
        refetch();
      } else {
        const sessionId = selectedForEval.sessionId || selectedForEval.SessionId;
        // For manual tests, we now save the checklist score directly
        await api.put(`/api/Sessions/UpdateScore`, {
          sessionId,
          score: ratingOrScore
        });

        const appId = selectedCandidate?.id;
        if (appId) {
          try { await api.get(`/api/Application/RefreshScore/${appId}`); } catch { }
        }
      }
      toast.success('Évaluation enregistrée');
      setShowEmojiRating(false);
      setShowChecklist(false);
      setChecklistDone(false);
      setChecklistChecked({});
      setSelectedForEval(null);
      setEvalDuration('');
      setEvalQuestions('');
      setEvalNotes('');
      refetchSessions();
      refetchApps();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const emojis = ['😠', '🙁', '😐', '🙂', '🤩'];

  if (selectedCandidate) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-6 items-center">
            <button
              onClick={() => setSelectedCandidate(null)}
              className="h-12 px-4 bg-secondary text-foreground rounded-xl flex items-center justify-center hover:opacity-90 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0 bg-gradient-to-br from-[#EF4444] to-[#F87171]`}>
                {getInitials(selectedCandidate.name)}
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground/90">{selectedCandidate.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold text-white shadow-sm ${getStatusColor(selectedCandidate.status)}`}>
                    {getStatusLabel(selectedCandidate.status)}
                  </span>
                  <p className="text-sm font-medium text-muted-foreground">{selectedCandidate.position}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={async () => {
                try {
                  const newRec = !selectedCandidate.isRecommended;
                  await api.put(`/api/Application/UpdateRecommendation/${selectedCandidate.id}?isRecommended=${newRec}`);
                  toast.success(newRec ? 'Candidat recommandé !' : 'Recommandation retirée');
                  setSelectedCandidate({ ...selectedCandidate, isRecommended: newRec });
                  refetchApps();
                } catch (e) {
                  toast.error('Erreur lors de la recommandation');
                }
              }}
              className={`h-12 w-12 rounded-xl border border-border/50 flex items-center justify-center transition-all ${selectedCandidate.isRecommended
                ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20'
                : 'bg-card text-muted-foreground hover:bg-secondary'
                }`}
              title={selectedCandidate.isRecommended ? "Recommandé" : "Recommander"}
            >
              <Star className={`w-6 h-6 ${selectedCandidate.isRecommended ? 'fill-current' : ''}`} />
            </button>
            {(isAdmin || isHR || isTL) && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!confirm('Voulez-vous vraiment supprimer définitivement ce candidat ?')) return;
                    try {
                      await api.delete(`/api/Application/${selectedCandidate.id}`);
                      toast.success('Candidat supprimé');
                      setSelectedCandidate(null);
                      refetchApps();
                    } catch (e) {
                      toast.error('Erreur lors de la suppression');
                    }
                  }}
                  className="h-12 w-12 bg-red-500/10 text-red-600 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                  title="Supprimer définitivement"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    try {
                      await api.put(`/api/Application/UpdateState/${selectedCandidate.id}?newState=3`);
                      toast.success('Candidat remis en cours');
                      refetchApps();
                      setSelectedCandidate({ ...selectedCandidate, status: 'en cours', adminDecision: 'In Progress' });
                    } catch (e) {
                      toast.error('Erreur');
                    }
                  }}
                  className="h-12 px-6 bg-blue-500/10 text-blue-600 rounded-xl font-bold hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-5 h-5" />
                  Réinitialiser
                </button>
                <button
                  onClick={async () => {
                    try {
                      await api.put(`/api/Application/UpdateState/${selectedCandidate.id}?newState=4`);
                      toast.success('Candidat refusé');
                      refetchApps();
                      setSelectedCandidate({ ...selectedCandidate, status: 'refusés', adminDecision: 'Rejected' });
                    } catch (e: any) {
                      toast.error(e?.response?.data?.message || 'Erreur (Vérifiez les prérequis: 1 test, 2 entretiens)');
                    }
                  }}
                  disabled={selectedCandidate.status === 'refusés'}
                  className="h-12 px-6 bg-red-500/10 text-red-600 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Refuser
                </button>
                <button
                  onClick={async () => {
                    try {
                      await api.put(`/api/Application/UpdateState/${selectedCandidate.id}?newState=2`);
                      toast.success('Candidat accepté !');
                      refetchApps();
                      setSelectedCandidate({
                        ...selectedCandidate,
                        status: 'acceptés',
                        adminDecision: 'Accepted'
                      });
                    } catch (e: any) {
                      toast.error(e?.response?.data?.message || 'Erreur (Vérifiez les prérequis: 1 test, 2 entretiens)');
                    }
                  }}
                  disabled={selectedCandidate.status === 'acceptés' || selectedCandidate.adminDecision === 'Accepted'}
                  title={selectedCandidate.status === 'acceptés' || selectedCandidate.adminDecision === 'Accepted' ? 'Candidat déjà accepté' : 'Accepter le candidat'}
                  className={`h-12 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${selectedCandidate.status === 'acceptés' || selectedCandidate.adminDecision === 'Accepted'
                    ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  Accepter
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex bg-card/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm w-fit">
          {['Profil', 'Tests', 'Entretiens', 'Décision', 'Timeline'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase() as any)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.toLowerCase() ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-secondary'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'profil' && (
              <motion.div
                key="profil" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-card p-6 rounded-3xl border border-border/40 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h4 className="text-xl font-bold tracking-tight">Profil professionnel</h4>
                    </div>
                    <p className="text-muted-foreground text-base leading-relaxed">
                      {selectedCandidate.analysis
                        ? selectedCandidate.analysis
                        : `Analyse IA en cours pour le poste de ${selectedCandidate.position}…`}
                    </p>
                  </section>

                  <section className="bg-card p-6 rounded-3xl border border-border/40 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      <h4 className="text-xl font-bold tracking-tight">Expertise & Compétences</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills.map((skill, i) => (
                        <div key={i} className="px-4 py-2 bg-secondary/50 rounded-xl text-sm font-semibold border border-border/50 hover:border-primary/30 transition-all">
                          {skill}
                        </div>
                      ))}
                    </div>
                  </section>

                  {(selectedCandidate.strengths.length > 0 || selectedCandidate.weaknesses.length > 0) && (
                    <section className="bg-card p-6 rounded-3xl border border-border/40 shadow-sm transition-all hover:shadow-md grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                          <h4 className="text-sm font-bold">Points Forts</h4>
                        </div>
                        <div className="space-y-2">
                          {selectedCandidate.strengths.slice(0, 3).map((strength, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-lg">
                              <CheckCircle className="w-3 h-3 text-[#16A34A] mt-0.5 flex-shrink-0" />
                              <span className="text-xs">{strength}</span>
                            </div>
                          ))}
                          {selectedCandidate.strengths.length === 0 && (
                            <p className="text-xs text-muted-foreground">Aucun point fort identifié.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingDown className="w-4 h-4 text-[#EA580C]" />
                          <h4 className="text-sm font-bold">Points d'Attention</h4>
                        </div>
                        <div className="space-y-2">
                          {selectedCandidate.weaknesses.slice(0, 3).map((weakness, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 bg-[#EA580C]/5 border border-[#EA580C]/20 rounded-lg">
                              <XCircle className="w-3 h-3 text-[#EA580C] mt-0.5 flex-shrink-0" />
                              <span className="text-xs">{weakness}</span>
                            </div>
                          ))}
                          {selectedCandidate.weaknesses.length === 0 && (
                            <p className="text-xs text-muted-foreground">Aucun point d'attention identifié.</p>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                <div className="space-y-6">
                  <section className="bg-card p-6 rounded-3xl border border-border/40 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="text-4xl font-black text-primary mb-1">{selectedCandidate.cvScore}%</div>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Score %</div>
                    </div>
                    <button
                      onClick={() => viewCvInApp(selectedCandidate.cvPath)}
                      className="w-full mt-6 h-12 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                      <Download className="w-5 h-5" />
                      Voir le CV
                    </button>
                  </section>

                  <section className="bg-card p-6 rounded-3xl border border-border/40 shadow-sm">
                    <h4 className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">Coordonnées</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/40">
                        <Mail className="w-4 h-4 text-primary" />
                        <p className="font-semibold text-sm truncate">{selectedCandidate.email || 'Non renseigné'}</p>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/40">
                        <Phone className="w-4 h-4 text-primary" />
                        <p className="font-semibold text-sm">{selectedCandidate.phone || 'Non renseigné'}</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-border/40">
                      <h4 className="text-[10px] font-bold text-muted-foreground mb-4 uppercase tracking-wider">Assigné à</h4>
                      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {selectedCandidate.assignedTeamLeader ? getInitials(`${selectedCandidate.assignedTeamLeader.name} ${selectedCandidate.assignedTeamLeader.prename}`) : '??'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">
                            {selectedCandidate.assignedTeamLeader ? `${selectedCandidate.assignedTeamLeader.name} ${selectedCandidate.assignedTeamLeader.prename}` : 'Non assigné'}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground truncate">Team Leader</p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => { fetchTeamLeaders(); setShowReassignModal(true); }}
                            className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                            title="Réassigner"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}
            {activeTab === 'tests' && (
              <motion.div
                key="tests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tests assignés</h4>
                  <button
                    onClick={() => { fetchAvailableTests(); setShowAssignModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-xs hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Assigner un test
                  </button>
                </div>

                {sessionsLoading ? (
                  <div className="py-10 text-center text-muted-foreground animate-pulse">Chargement des tests...</div>
                ) : (
                  (() => {
                    console.log('RAW SESSION DATA:', JSON.stringify(sessions?.slice(0, 2), null, 2));

                    const getScore = (session: any): number | null => {
                      const raw =
                        session?.score ??
                        session?.Score ??
                        session?.Session?.score ??
                        session?.Session?.Score ??
                        session?.session?.score ??
                        null;
                      if (raw === null || raw === undefined) return null;
                      const n = Number(raw);
                      return isNaN(n) ? null : n;
                    };

                    return sessions.length > 0 ? (
                      sessions.map((session: any, i: number) => (
                        <div
                          key={i}
                          className="bg-card p-6 rounded-3xl border border-border/40 shadow-sm flex items-center justify-between group hover:shadow-md transition-all border-l-4 border-l-primary/20"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                              <ClipboardList className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-primary/10 text-primary group-hover:bg-white/20 group-hover:text-white transition-colors">Test</span>
                                <span className="text-[10px] font-medium text-muted-foreground">Le {new Date(session.dateDebut || session.DateDebut || session.createdAt || session.CreatedAt).toLocaleDateString()}</span>
                                {!(session.sessionState || session.SessionState) && (
                                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-500/10 text-amber-600">En attente</span>
                                )}
                              </div>
                              <h5 className="text-xl font-bold tracking-tight">{session.examen?.titre || session.Examen?.Titre || 'Test technique'}</h5>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {(session.sessionState || session.SessionState) ? (
                              <div className="text-right">
                                <div className="text-3xl font-black text-primary tracking-tight">
                                  {(() => {
                                    const score = getScore(session);
                                    return score !== null
                                      ? `${Math.round(score)}%`
                                      : '0%';
                                  })()}
                                </div>
                                <div className="text-[9px] font-bold uppercase text-muted-foreground">Score obtenu</div>
                              </div>
                            ) : (
                              <div className="text-right text-muted-foreground italic text-xs font-medium">Non complété</div>
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => fetchSessionDetails(session, e)}
                                className="p-2.5 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm"
                                title="Voir les détails"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              {!isHR && (session.sessionState || session.SessionState) && !(session.examen?.titre || session.Examen?.Titre || "").toLowerCase().includes("quiz") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenChecklist(session); }}
                                  className="px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm font-bold text-xs"
                                >
                                  Évaluer
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDeleteSession(session.sessionId || session.SessionId, e)}
                                className="p-2.5 bg-secondary text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center bg-card rounded-3xl border border-dashed border-border/60">
                        <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground font-semibold">Aucun test complété pour le moment.</p>
                      </div>
                    );
                  })()
                )}
              </motion.div>
            )}

            {activeTab === 'entretiens' && (
              <motion.div
                key="entretiens" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center bg-card p-6 rounded-3xl border border-border/40 shadow-sm">
                  <div>
                    <h4 className="text-xl font-bold tracking-tight">Entretiens</h4>
                    <p className="text-sm text-muted-foreground font-medium">Gérez les rendez-vous avec le candidat</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewInterview({
                        date: new Date().toISOString().split('T')[0],
                        time: '10:00',
                        type: 'technique',
                        stepId: '',
                        meetLink: ''
                      });
                      setEditingInterview(null);
                      setShowAddInterview(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-5 h-5" />
                    Planifier un entretien
                  </button>
                </div>

                {interviewsLoading ? (
                  <div className="py-10 text-center text-muted-foreground animate-pulse">Chargement des entretiens...</div>
                ) : candidateInterviews && candidateInterviews.length > 0 ? (
                  candidateInterviews.map((interview: any, i: number) => {
                    if (!interview) return null;
                    const posName = interview.idPositionNavigation?.namePipline || interview.idPositionNavigation?.NamePipline || interview.IdPositionNavigation?.namePipline || interview.IdPositionNavigation?.NamePipline || 'Entretien';
                    const recName = interview.user?.name || interview.User?.Name || 'Recruteur';
                    const recDept = interview.user?.department || interview.User?.Department?.Name || interview.User?.departmentName;
                    const dateStr = interview.datePlanification || interview.DatePlanification;

                    return (
                      <div key={i} onClick={() => setViewInterviewDetails(interview)} className="bg-card p-6 rounded-3xl border border-border/40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <img
                                src={getDeptAvatar(recDept)}
                                className="w-8 h-8 rounded-full object-cover border border-primary/20"
                                alt={recName}
                              />
                              <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                {posName}
                              </span>
                              {dateStr && (
                                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                  {new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {(interview.idStatus === 4 || interview.IdStatus === 4) && (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md text-[10px] font-black uppercase">Terminé</span>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <h4 className="text-xl font-bold tracking-tight text-foreground/90">
                                {recName}
                              </h4>
                              {(interview.evaNote || interview.EvaNote) && (
                                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-3 py-1 rounded-xl text-sm font-black border border-amber-500/20 shadow-sm">
                                  {['', '😠', '🙁', '😐', '🙂', '🤩'][Math.round((interview.evaNote || interview.EvaNote) / 20)] || '⭐'}
                                  <span>{(interview.evaNote || interview.EvaNote) / 20}/5</span>
                                </div>
                              )}
                            </div>

                            {(interview.evaCommentaire || interview.EvaCommentaire) && (
                              <div className="mt-4 p-4 bg-secondary/30 rounded-2xl border border-border/40 italic text-sm text-muted-foreground leading-relaxed relative group-hover:bg-secondary/50 transition-colors">
                                <MessageSquare className="w-4 h-4 absolute -left-2 -top-2 text-primary opacity-20" />
                                {String(interview.evaCommentaire || interview.EvaCommentaire).replace(/\[MODE\]:.*|\[DURATION\]:.*|\[NOTES\]:/g, '').trim()}
                              </div>
                            )}

                            {(interview.meetLink || interview.MeetLink) && (
                              <div className="mt-3 flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/interview/${interview.recruitementProcessId || interview.RecruitementProcessId || interview.id || interview.Id}`);
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-xs font-bold shadow-md shadow-red-200"
                                >
                                  <Video className="w-4 h-4" />
                                  Rejoindre
                                </button>
                                <a
                                  href={interview.meetLink || interview.MeetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-xs font-bold border border-slate-200"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Lien direct
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedForEval(interview);
                                setEvalType('interview');
                                setShowEmojiRating(true);
                              }}
                              className="px-4 py-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all font-bold text-xs shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                              <Brain className="w-4 h-4" />
                              {(interview.evaNote || interview.EvaNote) ? 'Réévaluer' : 'Évaluer'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditInterview(interview); }}
                              className="p-3 bg-secondary text-muted-foreground/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-all shadow-sm"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const processId = interview.recruitementProcessId
                                  ?? interview.RecruitementProcessId
                                  ?? interview.id
                                  ?? interview.Id;
                                if (!processId) { toast.error('ID introuvable'); return; }
                                if (confirm('Voulez-vous vraiment annuler cet entretien ?')) {
                                  try {
                                    await api.delete(`/api/RecruitementProcess/${processId}`);
                                    toast.success('Entretien annulé');
                                    refetchApps();
                                    refetch();
                                  } catch (e) {
                                    toast.error('Erreur lors de l\'annulation');
                                  }
                                }
                              }}
                              className="p-3 bg-secondary text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shadow-sm"
                              title="Supprimer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center bg-card rounded-3xl border border-dashed border-border/60">
                    <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-semibold">Aucun entretien planifié pour le moment.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'décision' && (
              <motion.div
                key="decision" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {[
                    { label: 'Score CV', value: selectedCandidate.cvScore, icon: FileText, color: 'text-blue-500' },
                    { label: 'Score Tests', value: selectedCandidate.testScore, icon: Sparkles, color: 'text-amber-500' },
                    { label: 'Score Entretiens', value: selectedCandidate.hrScore, icon: MessageSquare, color: 'text-primary' },
                    { label: 'Score TL', value: tlScore, icon: Award, color: 'text-purple-500' },
                    { label: 'Score Global', value: selectedCandidate.finalScore || 0, icon: Brain, color: 'text-emerald-500', highlight: true }
                  ].map((stat, i) => (
                    <div key={i} className={`bg-card p-6 rounded-3xl border ${stat.highlight ? 'border-primary/30 shadow-lg shadow-primary/5' : 'border-border/40'} shadow-sm relative overflow-hidden group`}>

                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center ${stat.color}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <span className="text-2xl font-black">{Number(stat.value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                      </div>
                      <p className="text-l font-medium  tracking-normal text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-card border border-border/40 rounded-3xl p-8 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold tracking-tight">Décision Finale</h4>
                      <p className="text-sm text-muted-foreground font-medium">Validation finale par l'administration</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-center justify-between p-6 bg-secondary/20 rounded-3xl border border-border/40">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-muted-foreground">Statut actuel:</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(selectedCandidate.status)} text-white`}>
                          {getStatusLabel(selectedCandidate.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-muted-foreground">Recommandation:</span>
                        <span className={`font-bold ${selectedCandidate.isRecommended ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {selectedCandidate.isRecommended ? 'Hautement recommandé' : 'Aucune recommandation'}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap gap-4 w-full md:w-auto">
                        <button
                          onClick={async () => {
                            if (!confirm('Réinitialiser le processus ?')) return;
                            try {
                              await api.put(`/api/Application/UpdateState/${selectedCandidate.id}?newState=3`);
                              toast.success('Candidat remis en cours');
                              refetchApps();
                              setSelectedCandidate({ ...selectedCandidate, status: 'en cours', adminDecision: 'In Progress' });
                            } catch (e) {
                              toast.error('Erreur');
                            }
                          }}
                          className="flex-1 md:flex-none h-14 px-8 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Clock className="w-5 h-5" />
                          En cours
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/api/Application/UpdateState/${selectedCandidate.id}?newState=4`);
                              toast.success('Candidat refusé');
                              refetchApps();
                              setSelectedCandidate({ ...selectedCandidate, status: 'refusés', adminDecision: 'Rejected' });
                            } catch (e: any) {
                              toast.error(e?.response?.data?.message || 'Erreur (Vérifiez les prérequis: 1 test, 2 entretiens)');
                            }
                          }}
                          className="flex-1 md:flex-none h-14 px-8 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-5 h-5" />
                          Refuser
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/api/Application/UpdateState/${selectedCandidate.id}?newState=2`);
                              toast.success('Candidat accepté !');
                              refetchApps();
                              setSelectedCandidate({
                                ...selectedCandidate,
                                status: 'acceptés',
                                adminDecision: 'Accepted'
                              });
                            } catch (e: any) {
                              toast.error(e?.response?.data?.message || 'Erreur (Vérifiez les prérequis: 1 test, 2 entretiens)');
                            }
                          }}
                          disabled={selectedCandidate.status === 'acceptés' || selectedCandidate.adminDecision === 'Accepted'}
                          className={`flex-1 md:flex-none h-14 px-8 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${selectedCandidate.status === 'acceptés' || selectedCandidate.adminDecision === 'Accepted'
                            ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-xl transition-all'
                            }`}
                        >
                          <CheckCircle className="w-5 h-5" />
                          Accepter
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'timeline' && (
              <motion.div
                key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="relative py-4"
              >
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent rounded-full" />
                <div className="space-y-12">
                  {[
                    {
                      title: 'Candidature reçue',
                      date: selectedCandidate.appliedDate,
                      desc: 'Le candidat a postulé pour le poste via le portail carrière TriCareer.',
                      icon: User,
                      status: 'completed',
                      color: 'bg-blue-500'
                    },
                    {
                      title: 'Analyse IA & Matching',
                      date: selectedCandidate.appliedDate,
                      desc: `L'IA a analysé le CV avec un score de matching de ${selectedCandidate.cvScore}%.`,
                      icon: Zap,
                      status: 'completed',
                      color: 'bg-amber-500'
                    },
                    ... (Array.isArray(candidateInterviews) ? candidateInterviews : []).filter(i => i !== null && i !== undefined).map((int: any) => ({
                      title: int.idPositionNavigation?.namePosition || int.IdPositionNavigation?.NamePosition || 'Entretien',
                      date: int.datePlanification || int.DatePlanification,
                      desc: `Entretien planifié avec ${int.user?.name || int.User?.Name || 'un recruteur'}.`,
                      icon: MessageCircle,
                      status: 'pending',
                      color: 'bg-primary'
                    })),
                    {
                      title: 'Décision Finale',
                      date: null,
                      desc: 'En attente de la validation finale de l\'équipe RH.',
                      icon: Award,
                      status: 'upcoming',
                      color: 'bg-muted-foreground'
                    },
                  ].map((step, i) => (
                    <div key={i} className="relative pl-16 group">
                      <div className={`absolute left-[26px] top-1 w-4 h-4 rounded-full border-4 border-background z-10 shadow-sm transition-transform group-hover:scale-125 ${step.status === 'completed' ? 'bg-primary' :
                        step.status === 'pending' ? 'bg-amber-500' : 'bg-muted/40'
                        }`} />

                      <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm group-hover:shadow-md transition-all group-hover:border-primary/20">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl ${step.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                              <step.icon className="w-6 h-6" />
                            </div>
                            <div>
                              <h5 className="text-xl font-bold tracking-tight">{step.title}</h5>
                              {step.date && (
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mt-0.5">
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                  <span>{new Date(step.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${step.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                            step.status === 'pending' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                            {step.status === 'completed' ? 'Terminé' : step.status === 'pending' ? 'En cours' : 'À venir'}
                          </span>
                        </div>
                        <p className="text-muted-foreground font-medium text-base leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Interview Modal */}
        <AnimatePresence>
          {showAddInterview && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border/50 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {editingInterview ? 'Modifier l\'entretien' : 'Planifier un entretien'}
                  </h3>
                  <button onClick={() => { setShowAddInterview(false); setEditingInterview(null); }} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleScheduleInterview} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Etape du recrutement</label>
                    <select
                      required
                      value={newInterview.stepId}
                      onChange={(e) => setNewInterview({ ...newInterview, stepId: e.target.value })}
                      className="w-full h-12 px-4 bg-secondary/30 border border-border/50 rounded-xl outline-none focus:border-primary transition-all font-semibold"
                    >
                      <option value="">Sélectionner une étape</option>
                      {pipelineSteps?.map((step: any) => (
                        <option key={step.id} value={step.id}>{step.namePipline}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Date</label>
                      <input
                        type="date"
                        required
                        value={newInterview.date}
                        onChange={(e) => setNewInterview({ ...newInterview, date: e.target.value })}
                        className="w-full h-12 px-4 bg-secondary/30 border border-border/50 rounded-xl outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Heure</label>
                      <input
                        type="time"
                        required
                        value={newInterview.time}
                        onChange={(e) => setNewInterview({ ...newInterview, time: e.target.value })}
                        className="w-full h-12 px-4 bg-secondary/30 border border-border/50 rounded-xl outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="bg-secondary/20 p-4 rounded-2xl border border-border/40 space-y-3">
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Video className="w-3.5 h-3.5 text-primary" />
                      Lien de réunion
                    </label>

                    <input
                      type="text"
                      value={newInterview.meetLink}
                      onChange={(e) => setNewInterview({ ...newInterview, meetLink: e.target.value })}
                      placeholder="Lien Whereby (généré automatiquement si vide)..."
                      className="w-full h-10 px-4 bg-background border border-border/50 rounded-xl text-xs font-medium outline-none focus:border-primary transition-all"
                    />

                    <p className="text-[10px] text-muted-foreground italic leading-tight">
                      * Générez le lien dans la page <span className="text-primary font-bold">Entretiens</span> ou collez-le ici.
                    </p>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddInterview(false)}
                      className="flex-1 h-12 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-12 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                    >
                      Confirmer
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>



        {/* Emoji Rating Modal */}
        <AnimatePresence>
          {showEmojiRating && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border/50 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
              >
                <h3 className="text-2xl font-bold mb-6">Évaluer {evalType === 'interview' ? 'l\'entretien' : 'le test'}</h3>

                {evalType === 'interview' && (
                  <div className="space-y-4 mb-6 text-left">
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Durée (minutes)</label>
                      <input type="number" value={evalDuration} onChange={e => setEvalDuration(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background" placeholder="ex: 45" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Questions posées</label>
                      <textarea value={evalQuestions} onChange={e => setEvalQuestions(e.target.value)} className="w-full h-20 px-3 py-2 rounded-lg border border-border/50 bg-background resize-none" placeholder="Questions posées au candidat..."></textarea>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Commentaires / Notes</label>
                      <textarea value={evalNotes} onChange={e => setEvalNotes(e.target.value)} className="w-full h-20 px-3 py-2 rounded-lg border border-border/50 bg-background resize-none" placeholder="Vos impressions..."></textarea>
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-4 mb-8">
                  {['😞', '😐', '🙂', '😊', '🤩'].map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => handleSaveEvaluation(i + 1)}
                      className="text-4xl hover:scale-125 transition-transform p-2 bg-secondary/30 rounded-2xl"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowEmojiRating(false);
                    setEvalDuration('');
                    setEvalQuestions('');
                    setEvalNotes('');
                  }}
                  className="w-full h-12 bg-secondary text-foreground rounded-xl font-semibold"
                >
                  Annuler
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Checklist Modal */}
        <AnimatePresence>
          {showChecklist && (() => {
            // Group items by section
            const sections = checklistItems.reduce((acc: Record<string, any[]>, item: any) => {
              const sec = item.section || 'Général';
              if (!acc[sec]) acc[sec] = [];
              acc[sec].push(item);
              return acc;
            }, {});
            const totalItems = checklistItems.length;
            const checkedCount = Object.values(checklistChecked).filter(Boolean).length;
            const checklistScore = Math.round((checkedCount / Math.max(1, totalItems)) * 100);

            return (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border/50 rounded-3xl p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Grille d'évaluation</h3>
                        <p className="text-xs text-muted-foreground font-medium">{selectedForEval?.examen?.titre || selectedForEval?.Examen?.Titre || 'Test technique'}</p>
                      </div>
                    </div>
                    <button onClick={() => { setShowChecklist(false); setChecklistDone(false); setChecklistChecked({}); }} className="p-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
                      <span>{checkedCount}/{totalItems} critères validés</span>
                      <span className="text-primary">{checklistScore}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${checklistScore}%` }} />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4">
                    {Object.entries(sections).map(([sectionName, items]: [string, any[]]) => (
                      <div key={sectionName}>
                        <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3 pb-1 border-b border-primary/20">{sectionName}</h4>
                        <div className="space-y-2">
                          {items.map((item: any) => (
                            <label key={item.checklistId} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group ${checklistChecked[item.checklistId]
                              ? 'bg-emerald-500/8 border-emerald-500/30'
                              : 'bg-secondary/20 border-border/40 hover:border-primary/30'
                              }`}>
                              {/* Toggle Switch */}
                              <button
                                type="button"
                                onClick={() => setChecklistChecked(prev => ({ ...prev, [item.checklistId]: !prev[item.checklistId] }))}
                                className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${checklistChecked[item.checklistId] ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                                  }`}
                              >
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checklistChecked[item.checklistId] ? 'left-5' : 'left-0.5'
                                  }`} />
                              </button>
                              <span className={`text-sm font-semibold flex-1 ${checklistChecked[item.checklistId] ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground/80'
                                }`}>{item.criterion}</span>
                              {checklistChecked[item.checklistId] && (
                                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-border/50 flex gap-3">
                    <button onClick={() => { setShowChecklist(false); setChecklistChecked({}); }} className="flex-1 h-12 bg-secondary text-foreground rounded-xl font-semibold">Annuler</button>
                    <button
                      onClick={() => handleSaveEvaluation(checklistScore)}
                      className="flex-1 h-12 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                    >
                      Enregistrer l'évaluation ({checklistScore}%)
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

        {/* View Interview Details Modal */}
        <AnimatePresence>
          {viewInterviewDetails && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4" onClick={() => setViewInterviewDetails(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border border-border/50 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative"
              >
                <button
                  onClick={() => setViewInterviewDetails(null)}
                  className="absolute top-6 right-6 p-2 bg-secondary text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Détails de l'entretien</h3>
                    <p className="text-sm font-medium text-muted-foreground">
                      {viewInterviewDetails.user?.name || viewInterviewDetails.User?.Name || 'Recruteur'} • {viewInterviewDetails.datePlanification || viewInterviewDetails.DatePlanification ? new Date(viewInterviewDetails.datePlanification || viewInterviewDetails.DatePlanification).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Planifié'}
                    </p>
                    {/* Duration badge */}
                    {(() => {
                      const raw = String(viewInterviewDetails.evaCommentaire || viewInterviewDetails.EvaCommentaire || '');
                      const durMatch = raw.match(/\[DURATION\]:\s*([^\n\[]+)/);
                      if (!durMatch) return null;
                      return (
                        <p className="text-sm font-bold text-primary mt-1 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Durée : {formatDuration(durMatch[1].trim())}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  {/* Rating */}
                  <div className="bg-secondary/30 p-5 rounded-2xl border border-border/40">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Évaluation Globale</h4>
                    {(viewInterviewDetails.evaNote || viewInterviewDetails.EvaNote) ? (
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{['', '😠', '🙁', '😐', '🙂', '🤩'][Math.round((viewInterviewDetails.evaNote || viewInterviewDetails.EvaNote) / 20)] || '⭐'}</span>
                        <div className="text-3xl font-black text-primary">{((viewInterviewDetails.evaNote || viewInterviewDetails.EvaNote) / 20).toFixed(1)}<span className="text-lg text-muted-foreground">/5</span></div>
                        <div className="ml-auto text-right">
                          <p className="text-2xl font-black text-emerald-500">{viewInterviewDetails.evaNote || viewInterviewDetails.EvaNote}%</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Score</p>
                        </div>
                      </div>
                    ) : <p className="text-sm text-muted-foreground italic">Non évalué</p>}
                  </div>

                  {/* Questions posées — affiche le texte complet */}
                  {(() => {
                    const raw = String(viewInterviewDetails.evaCommentaire || viewInterviewDetails.EvaCommentaire || '');
                    const qMatch = raw.match(/\[QUESTIONS\]:\s*([\s\S]+?)(?=\[\w+\]:|$)/);
                    if (!qMatch) return null;
                    const lines = qMatch[1].trim().split('\n').filter(Boolean);
                    return (
                      <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
                          <Brain className="w-4 h-4" /> Questions posées ({lines.length})
                        </h4>
                        <ol className="space-y-2">
                          {lines.map((q, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-foreground/80 font-medium">
                              <span className="text-primary font-black shrink-0">{idx + 1}.</span>
                              <span>{q.replace(/^[-•\d.]+\s*/, '')}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })()}

                  {/* Notes */}
                  {(() => {
                    const raw = String(viewInterviewDetails.evaCommentaire || viewInterviewDetails.EvaCommentaire || '');
                    const notesMatch = raw.match(/\[NOTES\]:\s*([\s\S]+?)(?=\[\w+\]:|$)/);
                    const notes = notesMatch ? notesMatch[1].trim() : '';
                    if (!notes) return null;
                    return (
                      <div className="bg-secondary/30 p-5 rounded-2xl border border-border/40">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Notes du recruteur
                        </h4>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">{notes}</p>
                      </div>
                    );
                  })()}

                  {/* Actions */}
                  {Number(viewInterviewDetails.idStatus || viewInterviewDetails.IdStatus) === 2 && (
                    <div className="pt-6 flex gap-4">
                      <button
                        onClick={() => {
                          const id = viewInterviewDetails.recruitementProcessId || viewInterviewDetails.RecruitementProcessId || viewInterviewDetails.id;
                          navigate(`/interview/${id}`);
                        }}
                        className="flex-1 h-14 bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
                      >
                        <Video className="w-5 h-5" />
                        Rejoindre l'entretien (Hôte)
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* View Test Session Details Modal */}
        <AnimatePresence>
          {sessionDetails && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4" onClick={() => setSessionDetails(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border border-border/50 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
              >
                <button
                  onClick={() => setSessionDetails(null)}
                  className="absolute top-6 right-6 p-2 bg-secondary text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ClipboardList className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{sessionDetails.examTitle || 'Détails du Test'}</h3>
                    <p className="text-sm font-medium text-muted-foreground">
                      Candidat : {sessionDetails.candidateName || selectedCandidate?.name || 'Inconnu'}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-3xl font-black text-primary">{sessionDetails.score}%</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score Total</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {sessionDetails.sections?.map((section: any, sIdx: number) => (
                    <div key={sIdx} className="bg-secondary/20 rounded-2xl border border-border/40 overflow-hidden">
                      <div className="bg-secondary/40 px-6 py-4 border-b border-border/40">
                        <h4 className="text-lg font-bold tracking-tight text-foreground/90">{section.nomSection}</h4>
                      </div>
                      <div className="p-6 space-y-6">
                        {section.questions?.map((q: any, qIdx: number) => (
                          <div key={qIdx} className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <p className="font-semibold text-sm leading-relaxed">
                                <span className="text-muted-foreground mr-2">{qIdx + 1}.</span>
                                {q.textQuestion}
                              </p>
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold shrink-0 ${q.questionScore > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                {q.questionScore} pts
                              </span>
                            </div>
                            <div className="pl-6 space-y-2">
                              {q.typeQuestion === 'mcq' && q.options ? (
                                <div className="grid gap-2">
                                  {q.options.map((opt: any, oIdx: number) => (
                                    <div key={oIdx} className={`px-4 py-2 rounded-xl text-sm border flex items-center justify-between ${opt.isSelected && opt.isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700' :
                                      opt.isSelected && !opt.isCorrect ? 'bg-red-500/10 border-red-500/30 text-red-700' :
                                        !opt.isSelected && opt.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 border-dashed' :
                                          'bg-background border-border/40 text-muted-foreground'
                                      }`}>
                                      <span>{opt.textOption}</span>
                                      {opt.isSelected && opt.isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                      {opt.isSelected && !opt.isCorrect && <X className="w-4 h-4 text-red-500" />}
                                      {!opt.isSelected && opt.isCorrect && <CheckCircle className="w-4 h-4 text-emerald-400 opacity-50" title="Bonne réponse non cochée" />}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-background border border-border/40 p-4 rounded-xl text-sm flex items-center justify-between group/file">
                                  <div className="flex items-center gap-3 truncate">
                                    <FileText className="w-5 h-5 text-primary shrink-0" />
                                    <span className="text-foreground/80 font-medium truncate">
                                      {q.userAnswer || 'Aucune réponse fournie.'}
                                    </span>
                                  </div>
                                  {(q.userAnswer && (q.userAnswer.includes('.') || q.userAnswer.length > 20)) && (
                                    <a
                                      href={`http://localhost:5144/Resources/Tests/${q.userAnswer}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-2"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Télécharger
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {(!sessionDetails.sections || sessionDetails.sections.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground italic bg-secondary/20 rounded-2xl">
                      Aucune question ou réponse trouvée pour ce test.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Assign Test Modal */}
        <AnimatePresence>
          {showAssignModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border/50 rounded-3xl p-8 max-w-xl w-full shadow-2xl flex flex-col max-h-[80vh]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Assigner un nouveau test</h3>
                  <button onClick={() => setShowAssignModal(false)} className="p-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {availableTests.map((test: any) => (
                    <div
                      key={test.idExaman}
                      onClick={() => {
                        if (selectedCandidate.totalTests >= 3) {
                          toast.warning('Limite de 3 tests atteinte pour ce candidat.');
                          return;
                        }
                        if (!isAssigning) handleAssignTest(test.idExaman);
                      }}
                      className={`p-4 rounded-2xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-between group ${(isAssigning || selectedCandidate.totalTests >= 3) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div>
                        <p className="font-bold text-foreground/90 group-hover:text-primary transition-colors">{test.titre}</p>
                        <p className="text-xs text-muted-foreground">{test.description?.substring(0, 80)}...</p>
                      </div>
                      <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all" />
                    </div>
                  ))}
                  {availableTests.length === 0 && (
                    <div className="py-10 text-center text-muted-foreground italic">
                      Aucun modèle de test disponible.
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-border/50">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="w-full h-12 bg-secondary text-foreground rounded-xl font-bold"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reassign Team Leader Modal */}
        <AnimatePresence>
          {showReassignModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border/50 rounded-3xl p-8 max-w-xl w-full shadow-2xl flex flex-col max-h-[80vh]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Réassigner à un Team Leader</h3>
                  <button onClick={() => setShowReassignModal(false)} className="p-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {teamLeaders.map((tl: any) => (
                    <div
                      key={tl.userId || tl.UserId || tl.id}
                      onClick={() => !isReassigning && handleReassign(tl.userId || tl.UserId || tl.id)}
                      className={`p-4 rounded-2xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-between group ${isReassigning ? 'opacity-50 cursor-not-allowed' : ''} ${selectedCandidate.assignedTeamLeaderId === (tl.userId || tl.UserId || tl.id) ? 'bg-primary/5 border-primary/30' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {getInitials(`${tl.name} ${tl.prename}`)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground/90 group-hover:text-primary transition-colors">{tl.name} {tl.prename}</p>
                          <p className="text-xs text-muted-foreground">{tl.email}</p>
                        </div>
                      </div>
                      {selectedCandidate.assignedTeamLeaderId === (tl.userId || tl.UserId || tl.id) ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all" />
                      )}
                    </div>
                  ))}
                  {teamLeaders.length === 0 && (
                    <div className="py-10 text-center text-muted-foreground italic">
                      Aucun Team Leader disponible.
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-border/50">
                  <button
                    onClick={() => setShowReassignModal(false)}
                    className="w-full h-12 bg-secondary text-foreground rounded-xl font-bold"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Aperçu du CV dans l'app (pas de téléchargement) */}
        <AnimatePresence>
          {showCvViewer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
              onClick={closeCvViewer}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 shrink-0">
                  <h3 className="font-bold text-sm">CV — {selectedCandidate.name}</h3>
                  <button
                    onClick={closeCvViewer}
                    className="p-2 bg-secondary/50 rounded-xl hover:bg-red-500 hover:text-white active:scale-90 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 bg-secondary/20">
                  {cvViewerLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <div className="w-8 h-8 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <p className="text-sm font-semibold">Chargement du CV…</p>
                    </div>
                  ) : cvViewerUrl && cvViewerIsPdf ? (
                    <iframe src={cvViewerUrl} title="CV" className="w-full h-full border-0" />
                  ) : cvViewerUrl ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
                      <FileText className="w-10 h-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground max-w-xs">
                        L'aperçu intégré n'est disponible que pour les CV au format PDF. Ce fichier est dans un autre format.
                      </p>
                      {cvViewerDownloadUrl && (
                        <a
                          href={cvViewerDownloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="h-10 px-5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Ouvrir le fichier
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
      {/* Harmonized Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Vivier de candidats</h1>
          <p className="text-muted-foreground font-medium mt-1">Gérez vos talents avec précision et élégance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-card/50 p-1 rounded-xl border border-border/50 backdrop-blur-sm shadow-sm">
            {['all', 'en attente', 'en cours', 'refusés', 'acceptés'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === f ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'
                  }`}
              >
                {f === 'all' ? 'Tous' : getStatusLabel(f)}
              </button>
            ))}
          </div>
          <div className="flex bg-card/50 p-1 rounded-xl border border-border/50 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Harmonized Search */}
      <div className="relative group max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un candidat..."
          className="w-full h-12 pl-12 pr-4 bg-card border border-border/50 rounded-xl outline-none focus:border-primary transition-all font-semibold text-base shadow-sm"
        />
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse">Chargement...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => openCandidate(candidate)}
              className="group bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer flex flex-col"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="relative">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md group-hover:scale-105 transition-transform shrink-0 bg-gradient-to-br from-[#EF4444] to-[#F87171]`}>
                    {getInitials(candidate.name)}
                  </div>
                  {candidate.isRecommended && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-card animate-in zoom-in duration-300">
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors truncate">{candidate.name}</h3>
                <p className="text-sm font-medium text-muted-foreground truncate">{candidate.position}</p>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/70">
                  <MapPin className="w-4 h-4" />
                  {candidate.location}
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/70">
                  <Star className="w-4 h-4" />
                  {candidate.experience}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold text-white ${getStatusColor(candidate.status)}`}>
                  {getStatusLabel(candidate.status)}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Candidat</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Poste</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Score</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Statut</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  onClick={() => openCandidate(candidate)}
                  className="group hover:bg-primary/[0.02] transition-all cursor-pointer"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm bg-gradient-to-br from-[#EF4444] to-[#F87171]`}>
                          {getInitials(candidate.name)}
                        </div>
                        {candidate.isRecommended && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm border border-card">
                            <Star className="w-2 h-2 fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs group-hover:text-primary transition-colors tracking-tight truncate">{candidate.name}</p>
                        <p className="text-[10px] font-medium text-muted-foreground truncate">{candidate.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-xs tracking-tight text-muted-foreground truncate max-w-[160px]">{candidate.position}</p>
                  </td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <span className="text-sm font-bold text-primary tracking-tight">
                      {(candidate.finalScore || 0).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusColor(candidate.status)}`} />
                      <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{getStatusLabel(candidate.status)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between bg-card p-6 rounded-3xl border border-border/50 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground">
            Affichage de <span className="text-foreground">{(currentPage - 1) * pageSize + 1}</span> à <span className="text-foreground">{Math.min(currentPage * pageSize, total)}</span> sur <span className="text-foreground">{total}</span> candidats
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-xl border border-border/50 transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-secondary text-primary'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-10 h-10 rounded-xl font-bold transition-all ${currentPage === p ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-secondary'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(total / pageSize), prev + 1))}
              disabled={currentPage === Math.ceil(total / pageSize)}
              className={`p-2 rounded-xl border border-border/50 transition-all ${currentPage === Math.ceil(total / pageSize) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-secondary text-primary'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
