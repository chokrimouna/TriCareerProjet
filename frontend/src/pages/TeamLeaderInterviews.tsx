import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { CVViewer } from '../components/CVViewer';
import { Play, Pause, Video, Calendar, User, Clock, CheckCircle, FileText, Eye, Brain } from 'lucide-react';
import { api } from '../helpers/apiClient';
import { useInterviews } from '../hooks/useInterviews';
import { useUsers } from '../hooks/useUsers';
import { useApplications } from '../hooks/useApplications';
import { useJobPostings } from '../hooks/useJobPostings';
import { usePipeline } from '../hooks/usePipeline';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List as ListIcon, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Download,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Calendar as CalendarIcon,
  Video as VideoIcon,
  MapPin,
  Star,
  PlusCircle,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Clock8
} from 'lucide-react';
import { getDeptAvatar } from '../util/avatarHelper';

interface Interview {
  id: string;
  candidateName: string;
  position: string;
  type: 'rh' | 'technique' | 'final';
  date: string;
  time: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  interviewer: string;
  location: string;
  meetingLink?: string;
  hostMeetingLink?: string;
  candidateEmail?: string;
  experience?: string;
  skills?: string[];
  summary?: string;
  matchingScore?: number;
  duration?: number;
  evaNote?: number;
  evaCommentaire?: string;
  cvPath?: string;
}

interface QuestionRating {
  questionId: string;
  question: string;
  comportement: number; // 0-10
  stress: number; // 0-10
  competenceTechnique: number; // 0-10
  communication: number; // 0-10
  notes: string;
}

const helpfulQuestions = {
  rh: [
    'Parlez-moi de votre parcours professionnel',
    'Quelles sont vos principales motivations pour ce poste ?',
    'Comment gérez-vous les situations de stress ?',
    'Quelles sont vos attentes salariales ?',
    'Pourquoi souhaitez-vous rejoindre notre entreprise ?',
  ],
  technique: [
    'Décrivez votre expérience avec les technologies que nous utilisons',
    'Comment abordez-vous le debugging d\'un problème complexe ?',
    'Pouvez-vous expliquer un projet technique dont vous êtes fier ?',
    'Comment restez-vous à jour avec les nouvelles technologies ?',
    'Quelle est votre approche du code review ?',
  ],
  final: [
    'Où vous voyez-vous dans 5 ans ?',
    'Quels sont vos objectifs de carrière ?',
    'Comment pouvez-vous contribuer à notre équipe ?',
    'Avez-vous des questions sur l\'entreprise ou le poste ?',
    'Quand pourriez-vous commencer ?',
  ],
};

const emojiScale = [
  { emoji: '😰', label: 'Médiocre', value: 1, color: '#ef4444' },
  { emoji: '😐', label: 'Moyen', value: 2, color: '#f59e0b' },
  { emoji: '😊', label: 'Bien', value: 3, color: '#3b82f6' },
  { emoji: '😃', label: 'Très bien', value: 4, color: '#10b981' },
  { emoji: '🤩', label: 'Excellent', value: 5, color: '#059669' },
];

export function TeamLeaderInterviews() {
  const navigate = useNavigate();
  const [showCVViewer, setShowCVViewer] = useState(false);
  const [selectedCandidateForCV, setSelectedCandidateForCV] = useState<Interview | null>(null);

  const { data: allInterviews, loading: interviewsLoading, refetch } = useInterviews();
  const { data: usersData } = useUsers();
  const { data: applicationsData } = useApplications();
  const { data: postingsData } = useJobPostings();
  const { data: pipelineSteps } = usePipeline();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [formData, setFormData] = useState({
    candidateId: '',
    positionId: '',
    interviewerId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    duration: 60,
    type: 'technique' as Interview['type'],
    locationType: 'online' as 'online' | 'in_person',
    location: '',
    stepId: '',
    meetLink: ''
  });

  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);

  const handleGenerateMeetLink = async () => {
    if (!formData.candidateId) {
      toast.error('Veuillez d\'abord sélectionner un candidat.');
      return;
    }
    
    setIsGeneratingMeet(true);
    try {
      const user = JSON.parse(localStorage.getItem('tricareer_user') || '{}');
      const candidate = applicationsData?.find((a: any) => 
        String(a.ApplicationId || a.Id) === String(formData.candidateId)
      );

      const payload = {
        summary: `Entretien - ${candidate?.NameApplication || 'Candidat'}`,
        start: `${formData.date}T${formData.time}:00Z`,
        durationMinutes: formData.duration,
        attendees: candidate?.Email ? [candidate.Email] : [],
        plannerEmail: user.Email || user.email || user.emailAddress
      };

      const response = await api.post<any>('/api/RecruitementProcess/generateMeetLink', payload);
      setFormData(prev => ({ 
        ...prev, 
        meetLink: response.link,
        location: response.link // Also set as location for convenience
      }));
      toast.success('Lien Meet généré avec succès');
    } catch (err) {
      toast.error('Erreur lors de la génération du lien');
    } finally {
      setIsGeneratingMeet(false);
    }
  };

  const [liveQuestions, setLiveQuestions] = useState<{ id: string; text: string }[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [interviewToView, setInterviewToView] = useState<Interview | null>(null);

  const interviews: Interview[] = (allInterviews || []).map((it: any) => {
    const get = (obj: any, key: string) => obj?.[key] ?? obj?.[key.charAt(0).toLowerCase() + key.slice(1)];
    const app = get(it, 'Application');
    const job = get(app, 'JobPosting');
    const user = get(it, 'User');
    const statusNav = get(it, 'IdStatusNavigation');
    const posNav = get(it, 'IdPositionNavigation');

    return {
      id: String(get(it, 'RecruitementProcessId') ?? get(it, 'Id') ?? ''),
      candidateName: get(app, 'NameApplication') || get(it, 'CandidateName') || 'Unknown',
      position: get(posNav, 'PositionName') || get(job, 'PositionTitle') || get(it, 'Position') || 'Position',
      type: (get(it, 'Type') || 'technique').toString().toLowerCase() as Interview['type'],
      date: (get(it, 'DatePlanification') || get(it, 'Date') || new Date().toISOString()).split('T')[0],
      time: (get(it, 'DatePlanification') || get(it, 'Date') || '').split('T')[1]?.substring(0, 5) || '00:00',
      status: Number(get(it, 'IdStatus') || 0) === 4 ? 'completed' : 
              Number(get(it, 'IdStatus') || 0) === 3 ? 'in_progress' : 'scheduled',
      interviewer: get(user, 'Username') || get(user, 'Name') || get(it, 'Interviewer') || 'TBD',
      // Pas de valeur bidon "Remote" par défaut : on n'affiche que le vrai lieu s'il existe.
      location: get(it, 'Location') || '',
      meetingLink: get(it, 'MeetLink') || get(it, 'meetingLink'),
      hostMeetingLink: get(it, 'HostMeetLink') || get(it, 'hostMeetLink'),
      candidateEmail: get(app, 'Email') || get(it, 'CandidateEmail'),
      experience: get(app, 'Experience') || get(it, 'Experience'),
      skills: (get(app, 'Skills') || get(it, 'Skills') || '').split(',').map((s: any) => s.trim()).filter(Boolean),
      summary: get(it, 'Summary'),
      evaCommentaire: get(it, 'EvaCommentaire') || '',
      evaNote: Number(get(it, 'EvaNote') || 0),
      duration: Number(get(it, 'Duration') || 60),
      matchingScore: Number(get(app, 'CvScore') || get(it, 'MatchingScore') || 0),
      cvPath: get(app, 'CvPath') || get(app, 'cvPath') || '',
      applicationId: get(it, 'ApplicationId'),
      ApplicationId: get(it, 'ApplicationId'),
    };
  });

  const scheduledInterviews = interviews.filter(i => i.status === 'scheduled');
  const inProgressInterviews = interviews.filter(i => i.status === 'in_progress');
  const completedInterviews = interviews.filter(i => i.status === 'completed');

  const filteredInterviews = interviews.filter(i => {
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesSearch = 
      i.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.interviewer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [generalNotes, setGeneralNotes] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartInterview = (interview: Interview) => {
    setSelectedInterview({ ...interview, status: 'in_progress' });
    setIsRecording(true);
    setElapsedTime(0);
    setLiveQuestions([]); 
  };

  const [newQuestionText, setNewQuestionText] = useState('');

  const addLiveQuestion = () => {
    if (newQuestionText.trim()) {
      setLiveQuestions(prev => [...prev, { id: Date.now().toString(), text: newQuestionText.trim() }]);
      setNewQuestionText('');
    } else {
      toast.error('Veuillez saisir une question.');
    }
  };

  const startEditingQuestion = (id: string, text: string) => {
    setEditingQuestionId(id);
    setEditingQuestionText(text);
  };

  const saveEditedQuestion = () => {
    if (editingQuestionText.trim() && editingQuestionId) {
      setLiveQuestions(prev => prev.map(q => q.id === editingQuestionId ? { ...q, text: editingQuestionText.trim() } : q));
      setEditingQuestionId(null);
      setEditingQuestionText('');
    }
  };

  const deleteLiveQuestion = (id: string) => {
    if (confirm('Supprimer cette question ?')) {
      setLiveQuestions(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleFinishInterview = () => {
    setShowRatingModal(true);
  };

  const submitFinalResult = async () => {
    if (overallRating === null) {
      toast.error('Veuillez d\'abord choisir une note (cliquez sur un émoji) avant de valider.');
      return;
    }
    if (!selectedInterview) {
      toast.error('Aucun entretien sélectionné.');
      return;
    }
    const recruitementProcessId = parseInt(selectedInterview.id);
    if (isNaN(recruitementProcessId)) {
      toast.error('Entretien invalide : identifiant introuvable.');
      return;
    }

    try {
      const emoji = emojiScale.find(e => e.value === overallRating)?.emoji;

      const payload = {
        recruitementProcessId,
        applicationId: selectedInterview.applicationId || selectedInterview.ApplicationId,
        idStatus: 4, // Completed
        evaNote: overallRating * 20, // Scale 1-5 to 1-100
        evaCommentaire: `[SCORE]: ${overallRating}/5 ${emoji}\n[NOTES]: ${generalNotes}\n[QUESTIONS]: ${liveQuestions.length} questions posées.`
      };

      await api.put('/api/RecruitementProcess', payload);

      toast.success(`Entretien terminé - Note globale : ${emoji}`);
      
      setSelectedInterview(null);
      setIsRecording(false);
      setShowRatingModal(false);
      setOverallRating(null);
      setElapsedTime(0);
      setGeneralNotes('');
      setLiveQuestions([]);
      
      refetch();
    } catch (error: any) {
      console.error('Error saving interview result:', error);
      toast.error('Erreur lors de l\'enregistrement du résultat.');
    }
  };

  const handleCreateInterview = async () => {
    if (!formData.candidateId || !formData.date || !formData.time || !formData.interviewerId) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      const payload = {
        recruitementProcess: {
          applicationId: parseInt(formData.candidateId),
          userId: parseInt(formData.interviewerId),
          datePlanification: `${formData.date}T${formData.time}:00`,
          idPosition: parseInt(formData.stepId) || 1006, 
          idStatus: 2,      // Scheduled (Changed from 3 to 2 for consistency)
          meetLink: formData.meetLink,
          evaCommentaire: `Entretien prévu en ${formData.locationType === 'online' ? 'ligne' : 'présentiel'} à ${formData.location || 'Remote'}`
        },
        idExamen: null
      };

      if (isEditing && editingId) {
        await api.put('/api/RecruitementProcess', {
          ...payload.recruitementProcess,
          recruitementProcessId: parseInt(editingId)
        });
        toast.success('Entretien mis à jour !');
      } else {
        await api.post('/api/RecruitementProcess', payload);
        toast.success('Entretien planifié avec succès !');
      }
      refetch();
      setIsModalOpen(false);
      setIsEditing(false);
      setEditingId(null);
      setFormData({
        candidateId: '',
        positionId: '',
        interviewerId: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        duration: 60,
        type: 'technique',
        locationType: 'online',
        location: '',
        meetLink: ''
      });
    } catch (error: any) {
      console.error('Error planning interview:', error);
      toast.error(error.message || 'Erreur lors de la planification de l\'entretien');
    }
  };

  const handleEditInterview = (interview: Interview) => {
    setEditingId(interview.id);
    setIsEditing(true);
    setFormData({
      candidateId: interview.candidateEmail || '', // Assuming email can be used to find candidate if ID is missing
      positionId: interview.position,
      interviewerId: interview.interviewer,
      date: interview.date.split('T')[0],
      time: interview.time,
      duration: 60,
      type: interview.type,
      locationType: interview.location.toLowerCase().includes('http') || interview.location.toLowerCase().includes('meet') ? 'online' : 'in_person',
      location: interview.location,
      meetLink: interview.meetingLink || '',
      stepId: (interview as any).idPosition || (interview as any).IdPosition || '',
    });
    setIsDetailViewOpen(false);
    setIsModalOpen(true);
  };

  const handleDeleteInterview = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet entretien ?')) {
      try {
        await api.delete(`/api/RecruitementProcess/${id}`);
        toast.success('Entretien supprimé.');
        refetch();
        setIsDetailViewOpen(false);
      } catch (error: any) {
        toast.error('Erreur lors de la suppression.');
        console.error('Delete error:', error);
      }
    }
  };

  const getInterviewTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      rh: 'RH',
      technique: 'Technique',
      final: 'Final',
    };
    return labels[type] || type;
  };

  if (selectedInterview && isRecording) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <span className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                En cours
              </span>
               <span className="text-muted-foreground text-sm font-medium">
                {selectedInterview.position}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{selectedInterview.candidateName}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 px-6 py-3 bg-secondary/50 rounded-2xl border border-border/40 backdrop-blur-md">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-2xl font-mono font-bold tracking-tighter text-primary">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="h-14 w-14 bg-white shadow-xl rounded-2xl flex items-center justify-center hover:scale-105 transition-all border border-border/20 active:scale-95"
            >
              {isPaused ? <Play className="w-6 h-6 text-primary fill-primary" /> : <Pause className="w-6 h-6 text-primary fill-primary" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Questions posées</h2>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${liveQuestions.length < 5 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {liveQuestions.length}/5 questions
                  </span>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                      <PlusCircle className="w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addLiveQuestion()}
                      placeholder="Ajouter une nouvelle question..."
                      className="w-full h-14 pl-14 pr-6 bg-secondary/10 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
                    />
                  </div>
                  <button 
                    onClick={addLiveQuestion}
                    className="h-14 px-8 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {liveQuestions.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-3xl">
                    <p className="text-muted-foreground font-medium text-sm">Aucune question ajoutée pour le moment (Min. 5 requises).</p>
                  </div>
                ) : (
                  liveQuestions.map((q, idx) => (
                    <motion.div
                      layout
                      key={q.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-5 bg-secondary/20 rounded-2xl border border-border/30 flex items-start justify-between group"
                    >
                      <div className="flex-1 mr-4">
                        <div className="flex gap-4">
                          <span className="text-primary font-bold mt-0.5">{idx + 1}.</span>
                          {editingQuestionId === q.id ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={editingQuestionText}
                                onChange={(e) => setEditingQuestionText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEditedQuestion()}
                                className="flex-1 bg-white border border-primary/30 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-primary/20 font-medium text-sm"
                                autoFocus
                              />
                              <button 
                                onClick={saveEditedQuestion}
                                className="px-3 py-1 bg-primary text-white rounded-lg text-[10px] font-bold uppercase"
                              >
                                Enregistrer
                              </button>
                            </div>
                          ) : (
                            <p className="font-medium text-foreground/90">{q.text}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button 
                          onClick={() => startEditingQuestion(q.id, q.text)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteLiveQuestion(q.id)}
                          className="p-2 text-muted-foreground hover:text-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
                <div className="mt-4 flex items-center justify-between px-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${liveQuestions.length < 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    Progression: {liveQuestions.length}/5 questions
                  </span>
                  {liveQuestions.length < 5 && (
                    <span className="text-[10px] text-muted-foreground italic">Posez au moins 5 questions pour terminer</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Notes de l'entretien</h2>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Points clés abordés, forces et faiblesses..."
                className="w-full h-40 px-6 py-4 bg-secondary/15 border border-border/40 rounded-3xl outline-none focus:ring-2 focus:ring-primary/20 resize-none font-medium text-sm leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Détails Candidat</h3>
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Expérience</p>
                    <p className="font-bold text-sm tracking-tight">{selectedInterview.experience || 'Non précisé'}</p>
                  </div>
                </div>

              </div>

              <div className="mt-8 pt-8 border-t border-border/40">
                <button
                  onClick={() => {
                    setSelectedCandidateForCV(selectedInterview);
                    setShowCVViewer(true);
                  }}
                  className="w-full h-12 bg-secondary text-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-secondary/80 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Voir l'analyse CV
                </button>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-8 text-center">
              <h3 className="text-lg font-bold text-primary mb-2">Fin de l'entretien</h3>
              <p className="text-xs text-muted-foreground mb-6 font-medium">Assurez-vous d'avoir noté tous les points importants avant de terminer.</p>
              <button
                onClick={handleFinishInterview}
                className="w-full h-14 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
              >
                Terminer & Noter
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showRatingModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-card border border-border/40 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl text-center"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <Star className="w-10 h-10 text-primary fill-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Note globale de l'entretien</h2>
                <p className="text-muted-foreground text-sm mb-8 font-medium">Quelle est votre impression générale sur le candidat ?</p>
                
                <div className="flex justify-center items-center gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
                  {emojiScale.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setOverallRating(s.value)}
                      className={`flex flex-col items-center gap-2 p-3 min-w-[70px] rounded-2xl transition-all border-2 group ${
                        overallRating === s.value 
                        ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10 scale-105' 
                        : 'bg-secondary/10 border-transparent hover:border-border/60'
                      }`}
                    >
                      <span className="text-3xl group-hover:scale-110 transition-transform">{s.emoji}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-widest text-center ${
                        overallRating === s.value ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 h-14 bg-secondary text-foreground rounded-2xl font-bold text-sm"
                  >
                    Retour
                  </button>
                  <button
                    onClick={submitFinalResult}
                    disabled={overallRating === null}
                    className="flex-1 h-14 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-opacity"
                  >
                    Valider le score
                  </button>
                </div>
                {overallRating === null && (
                  <p className="text-[11px] text-muted-foreground mt-3 font-medium">
                    Choisissez d'abord une note ci-dessus.
                  </p>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const paginatedInterviews = filteredInterviews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredInterviews.length / itemsPerPage);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Entretiens</h1>
          <p className="text-muted-foreground font-medium">
            Gérez et planifiez vos échanges avec les candidats.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-secondary/50 p-1 rounded-xl border border-border/40">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-12 px-6 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 flex items-center gap-3"
          >
            <Plus className="w-5 h-5" />
            Planifier un entretien
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: 'scheduled', label: 'Entretiens Planifiés', value: scheduledInterviews.length, icon: CalendarIcon, color: 'primary' },
          { id: 'in_progress', label: 'Entretiens en cours', value: inProgressInterviews.length, icon: VideoIcon, color: 'blue' },
          { id: 'completed', label: 'Entretiens Terminés', value: completedInterviews.length, icon: CheckCircle2, color: 'emerald' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              setStatusFilter(statusFilter === stat.id ? 'all' : (stat.id as any));
              setCurrentPage(1);
            }}
            className={`group bg-card border rounded-[2rem] p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${
              statusFilter === stat.id ? 'border-primary ring-2 ring-primary/20' : 'border-border/50'
            }`}
          >
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform ${
                stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                'bg-emerald-500/10 text-emerald-500'
              }`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex bg-secondary/30 p-1 rounded-2xl w-fit border border-border/40">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'scheduled', label: 'Planifiés' },
            { id: 'in_progress', label: 'En cours' },
            { id: 'completed', label: 'Terminés' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                statusFilter === tab.id
                  ? 'bg-white text-primary shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Rechercher un candidat, poste ou recruteur..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-12 pl-12 pr-4 bg-card border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-sm transition-all"
          />
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paginatedInterviews.map((interview, index) => (
            <motion.div
              layout
              key={interview.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
              onClick={() => {
                setInterviewToView(interview);
                setIsDetailViewOpen(true);
              }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform bg-gradient-to-br from-primary to-primary/60">
                  <User className="w-6 h-6" />
                </div>

                <div className="flex items-center gap-2">
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    interview.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                    interview.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {interview.status === 'completed' ? 'Terminé' :
                     interview.status === 'in_progress' ? 'En cours' :
                     'Planifié'}
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleEditInterview(interview)}
                      className="p-1.5 bg-secondary hover:bg-primary hover:text-white rounded-lg transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteInterview(interview.id)}
                      className="p-1.5 bg-secondary hover:bg-error hover:text-white rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                  {interview.candidateName}
                </h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-muted-foreground text-sm font-medium line-clamp-1">
                    {interview.position}
                  </p>
                  {!!interview.matchingScore && interview.matchingScore > 0 && (
                    <div className="flex items-center gap-1 bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-black border border-blue-500/20 shadow-sm shrink-0">
                      <Brain className="w-3 h-3" />
                      <span>{interview.matchingScore}%</span>
                    </div>
                  )}
                </div>
                {interview.status === 'completed' && interview.evaNote > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-2xl">
                      {interview.evaNote <= 20 ? '😰' :
                       interview.evaNote <= 40 ? '😐' :
                       interview.evaNote <= 60 ? '😊' :
                       interview.evaNote <= 80 ? '😄' : '🤩'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  {new Date(interview.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  {interview.time}
                </div>
                {interview.location && (
                  <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    {interview.location}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-border/30 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recruteur</span>
                  <span className="font-bold text-sm tracking-tight">{interview.interviewer}</span>
                </div>

                {interview.status === 'scheduled' && (
                  <div className="flex gap-2">
                    {(interview.meetingLink || interview.hostMeetingLink) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/interview/${interview.id}`);
                        }}
                        className="h-10 px-4 bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2"
                      >
                        <VideoIcon className="w-4 h-4" />
                        Rejoindre {interview.hostMeetingLink ? '(Hôte)' : ''}
                      </button>
                    )}
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleStartInterview(interview); 
                      }}
                      className="h-10 px-5 bg-primary text-white rounded-xl font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      Commencer
                    </button>
                  </div>
                )}
                {interview.status === 'completed' && (
                  <div className="flex items-center gap-3">
                    {interview.evaCommentaire?.includes('[SCORE]:') && (
                      <span className="text-xl" title={interview.evaCommentaire}>
                        {interview.evaCommentaire.split('[SCORE]:')[1].split('\n')[0].split(' ').pop()}
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/10 border-b border-border/40">
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Candidat</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Poste</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Matching</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date & Heure</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recruteur</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {paginatedInterviews.map((interview) => (
                <tr 
                  key={interview.id}
                  onClick={() => {
                    setInterviewToView(interview);
                    setIsDetailViewOpen(true);
                  }}
                  className="group hover:bg-secondary/5 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {interview.candidateName.charAt(0)}
                      </div>
                      <span className="font-bold text-sm">{interview.candidateName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground font-medium">{interview.position}</span>
                  </td>
                  <td className="px-6 py-4">
                    {!!interview.matchingScore && interview.matchingScore > 0 ? (
                      <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 px-3 py-1 rounded-xl text-[11px] font-black border border-blue-500/20 shadow-sm w-fit">
                        <Brain className="w-3.5 h-3.5" />
                        <span>{interview.matchingScore}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground/80">{interview.date}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">{interview.time}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium">{interview.interviewer}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      interview.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                      interview.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {interview.status === 'completed' ? 'Terminé' :
                       interview.status === 'in_progress' ? 'En cours' :
                       'Planifié'}
                      {interview.status === 'completed' && interview.evaCommentaire?.includes('[SCORE]:') && (
                        <span className="ml-1">
                          {interview.evaCommentaire.split('[SCORE]:')[1].split('\n')[0].split(' ').pop()}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      {interview.status === 'scheduled' && (
                        <div className="flex gap-1">
                          {(interview.meetingLink || interview.hostMeetingLink) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/interview/${interview.id}`);
                              }}
                              className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-all"
                              title={`Rejoindre ${interview.hostMeetingLink ? '(Hôte)' : ''}`}
                            >
                              <VideoIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartInterview(interview)}
                            className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
                            title="Commencer"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => handleEditInterview(interview)}
                        className="p-2 bg-secondary hover:bg-primary hover:text-white rounded-lg transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteInterview(interview.id)}
                        className="p-2 bg-secondary hover:bg-error hover:text-white rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary disabled:opacity-50 transition-all hover:bg-secondary/80"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                currentPage === i + 1 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary disabled:opacity-50 transition-all hover:bg-secondary/80"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Planning Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card border border-border/40 rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <h2 className="text-2xl font-bold mb-8 tracking-tight text-center">
                {isEditing ? 'Modifier l\'entretien' : 'Planifier un entretien'}
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Candidat *</label>
                  <select
                    value={formData.candidateId}
                    onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
                    className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  >
                    <option value="">Sélectionner un candidat</option>
                    {applicationsData?.map((app: any) => (
                      <option key={app.applicationId || app.ApplicationId} value={app.applicationId || app.ApplicationId}>
                        {(app.user?.name || app.user?.Name || app.nameApplication || app.NameApplication)} {(app.user?.prename || app.user?.Prename || '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Poste visé *</label>
                  <select
                    value={formData.positionId}
                    onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                    className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  >
                    <option value="">Sélectionner un poste</option>
                    {postingsData?.map((p: any) => (
                      <option key={p.jobPostingId || p.JobPostingId} value={p.jobPostingId || p.JobPostingId}>
                        {p.positionTitle || p.PositionTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Heure *</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Étape du recrutement *</label>
                  <select
                    value={formData.stepId}
                    onChange={(e) => setFormData({ ...formData, stepId: e.target.value })}
                    className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  >
                    <option value="">Sélectionner une étape</option>
                    {(Array.isArray(pipelineSteps) ? pipelineSteps : []).map((step: any) => (
                      <option key={step.id || step.Id} value={step.id || step.Id}>
                        {step.namePipline || step.NamePipline}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Interviewer *</label>
                  <select
                    value={formData.interviewerId}
                    onChange={(e) => setFormData({ ...formData, interviewerId: e.target.value })}
                    className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  >
                    <option value="">Sélectionner un interviewer</option>
                    {usersData?.filter((u: any) => {
                      const roleDesc = u.role?.description || u.Role?.Description || u.role || u.Role || '';
                      const descStr = typeof roleDesc === 'string' ? roleDesc : (roleDesc?.description || '');
                      return descStr.toLowerCase().includes('teamleader') || descStr.toLowerCase().includes('admin');
                    }).map((u: any) => (
                      <option key={u.userId || u.UserId} value={u.userId || u.UserId}>
                        {(u.name || u.Name)} {(u.prename || u.Prename)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Lieu / Mode *</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setFormData({ ...formData, locationType: 'online' })}
                      className={`flex-1 h-12 rounded-2xl border transition-all font-bold text-sm flex items-center justify-center gap-2 ${
                        formData.locationType === 'online' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/15 border-border/40 text-muted-foreground hover:bg-secondary/30'
                      }`}
                    >
                      <VideoIcon className="w-4 h-4" />
                      En ligne
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, locationType: 'in_person' })}
                      className={`flex-1 h-12 rounded-2xl border transition-all font-bold text-sm flex items-center justify-center gap-2 ${
                        formData.locationType === 'in_person' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/15 border-border/40 text-muted-foreground hover:bg-secondary/30'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      Présentiel
                    </button>
                  </div>
                </div>

                {formData.locationType === 'online' && (
                  <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 space-y-3">
                    <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <VideoIcon className="w-3.5 h-3.5" />
                      Lien de visioconférence (Whereby)
                    </label>
                    
                    {!formData.meetLink ? (
                        <button
                          type="button"
                          disabled={isGeneratingMeet}
                          onClick={handleGenerateMeetLink}
                          className="w-full h-10 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-500/10"
                        >
                          {isGeneratingMeet ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : <Plus className="w-4 h-4" />}
                          Générer un lien Whereby
                        </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-10 px-3 bg-white border border-emerald-500/30 rounded-xl flex items-center gap-2 overflow-hidden group">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-xs font-mono text-emerald-600 truncate">{formData.meetLink}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, meetLink: '', location: '' }))}
                          className="p-2 bg-red-500/10 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {formData.locationType === 'in_person' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Salle de réunion, Adresse..."
                      className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    />
                    {/* Localisation des locaux de TriWeb sur la carte */}
                    <div className="rounded-2xl overflow-hidden border border-border/40">
                      <div className="px-4 py-2 bg-secondary/20 text-xs font-bold text-muted-foreground">
                        📍 Locaux de TriWeb — 18 rue de l'Artisanat, 2035 Charguia 2, Tunis
                      </div>
                      <iframe
                        title="Localisation TriWeb"
                        src="https://maps.google.com/maps?q=18%20rue%20de%20l'Artisanat%2C%202035%20Charguia%202%2C%20Tunis&z=15&output=embed"
                        className="w-full h-52 border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-14 bg-secondary text-foreground rounded-2xl font-bold text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateInterview}
                  className="flex-1 h-14 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20"
                >
                  Planifier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Overlay */}
      <AnimatePresence>
        {isDetailViewOpen && interviewToView && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsDetailViewOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 20 }}
              className="relative bg-card border border-border/40 rounded-[3rem] p-10 max-w-4xl w-full shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary">
                    <User className="w-10 h-10" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        interviewToView.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
                      }`}>
                        {interviewToView.status === 'completed' ? 'Terminé' : 'Planifié'}
                      </span>
                      <span className="text-muted-foreground text-sm font-medium">{interviewToView.position}</span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">{interviewToView.candidateName}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {interviewToView.status === 'scheduled' && (
                    <button
                      onClick={() => {
                        setIsDetailViewOpen(false);
                        handleStartInterview(interviewToView);
                      }}
                      className="h-12 px-5 bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 font-bold text-xs uppercase tracking-wider"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Commencer
                    </button>
                  )}
                  <button 
                    onClick={() => handleEditInterview(interviewToView)}
                    className="h-12 w-12 bg-secondary hover:bg-primary hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteInterview(interviewToView.id)}
                    className="h-12 w-12 bg-secondary hover:bg-error hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setIsDetailViewOpen(false)}
                    className="h-12 w-12 bg-secondary hover:bg-secondary/80 rounded-2xl flex items-center justify-center transition-all shadow-sm"
                  >
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Informations de l'entretien</h3>
                    <div className="bg-secondary/10 rounded-3xl p-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Date & Durée Prévue</p>
                          <p className="font-bold text-sm">{new Date(interviewToView.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} ({interviewToView.duration} min)</p>
                        </div>
                      </div>
                      
                      {interviewToView.location && !interviewToView.location.includes('http') && (
                        <div className="flex items-center gap-4">
                          <MapPin className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Lieu</p>
                            <p className="font-bold text-sm truncate max-w-[200px]">{interviewToView.location}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {interviewToView.status === 'completed' && interviewToView.evaNote > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-5xl">
                          {interviewToView.evaNote <= 20 ? '😰' :
                           interviewToView.evaNote <= 40 ? '😐' :
                           interviewToView.evaNote <= 60 ? '😊' :
                           interviewToView.evaNote <= 80 ? '😄' : '🤩'}
                        </span>
                        <p className="text-[10px] font-bold text-emerald-600/60 uppercase">Impression générale</p>
                      </div>
                      
                      <div className="h-10 w-px bg-emerald-500/20" />

                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-border/20 flex items-center justify-center overflow-hidden">
                           <img 
                            src={getDeptAvatar(interviewToView.position, 'team leader')} 
                            className="w-full h-full object-cover" 
                            alt="TL Avatar" 
                          />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{interviewToView.interviewer}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Recruteur</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!interviewToView.evaCommentaire && interviewToView.status === 'completed' && (
                    <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6">
                      <p className="text-xs text-muted-foreground italic text-center">Aucun commentaire n'a été laissé pour cet entretien.</p>
                    </div>
                  )}

                  {interviewToView.evaCommentaire && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6">
                      <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">Commentaire du recruteur</h3>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">"{interviewToView.evaCommentaire}"</p>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <div>
                  </div>

                  <div>
                    {/* Commencer button moved to top header */}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showCVViewer && selectedCandidateForCV && (
        <CVViewer
          candidateName={selectedCandidateForCV.candidateName}
          candidateEmail={selectedCandidateForCV.candidateEmail}
          position={selectedCandidateForCV.position}
          experience={selectedCandidateForCV.experience}
          skills={selectedCandidateForCV.skills}
          summary={selectedCandidateForCV.summary}
          matchingScore={selectedCandidateForCV.matchingScore}
          cvPath={selectedCandidateForCV.cvPath}
          onClose={() => {
            setShowCVViewer(false);
            setSelectedCandidateForCV(null);
          }}
        />
      )}
    </div>
  );
}
