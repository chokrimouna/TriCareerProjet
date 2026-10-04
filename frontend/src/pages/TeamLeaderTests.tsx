import { useMemo, useState, useEffect } from 'react';
import {
  Plus,
  Code,
  Palette,
  ListChecks,
  PenTool,
  ChevronRight,
  CheckCircle,
  Sparkles,
  X,
  Clock,
  Award,
  Trash2,
  ArrowLeft,
  ChevronLeft,
  Edit2,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  TrendingUp,
  Calendar,
  FileText,
  UserPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { toast } from 'sonner';
import { useApplications } from '../hooks/useApplications';
import { api } from '../helpers/apiClient';

interface Candidate {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'boolean';
  options?: string[];
  optionIds?: (number | null)[]; // To store backend answer IDs
  correctAnswer: string;
  points: number;
}

interface CurrentQuestion extends Partial<Omit<Question, 'options' | 'optionIds'>> {
  options: string[];
  optionIds: (number | null)[];
  correctAnswerIndex?: number;
}

interface Test {
  id: string;
  title: string;
  type: 'code' | 'design' | 'quiz' | 'redaction';
  duration: number;
  totalPoints: number;
  description: string;
  questions?: Question[];
  subject?: string;
  createdBy?: string;
}

const existingTests: Test[] = [];

export function TeamLeaderTests() {
  const user = useSelector((s: RootState) => s.auth.user);
  const currentUserId = String(user?.Id || user?.id || user?.userId || '');
  const rawRole = (user?.role || user?.Role || '').toString().toLowerCase();
  const isHR = rawRole === 'rh' || rawRole === 'hr';

  const { data: applicationsData } = useApplications();

  const candidates: Candidate[] = useMemo(() => {
    return (Array.isArray(applicationsData) ? applicationsData : []).map((app: any) => {
      const get = (obj: any, key: string) => obj?.[key] ?? obj?.[key.charAt(0).toLowerCase() + key.slice(1)];
      const user = get(app, 'User');
      
      const firstName = get(user, 'Name') ?? '';
      const lastName = get(user, 'Prename') ?? '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      return {
        id: String(get(app, 'ApplicationId') ?? get(app, 'Id') ?? ''),
        name: get(app, 'NameApplication') || fullName || 'Candidat Anonyme',
        email: get(app, 'Email') || get(user, 'Email') || '',
        avatar: get(user, 'Avatar'),
      };
    });
  }, [applicationsData]);

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'models' | 'assigned'>('models');
  const [filterType, setFilterType] = useState<'all' | 'quiz' | 'code' | 'redaction' | 'design'>('all');

  // Fetch tests on mount
  useEffect(() => {
    (async () => {
       try {
         const res = await api.get<any[]>('/api/Examans');
         const mappedTests: Test[] = res.map(t => ({
            id: String(t.idExaman),
            title: t.titre,
            description: t.description,
            type: (() => {
              const hasQuizAnswers = t.detailsExamen?.some((d: any) => 
                d.idQuestionNavigation?.answers?.some((a: any) => a.isCorrect === 1)
              );
              if (hasQuizAnswers) return 'quiz';
              
              const title = t.titre?.toLowerCase() || '';
              if (title.includes('code')) return 'code';
              if (title.includes('design')) return 'design';
              if (title.includes('redaction') || title.includes('rédac')) return 'redaction';
              
              return 'redaction'; // Default to redaction if no MCQ answers found
            })(),
            duration: 60, // We should fetch this from questions total or a field if exists
            totalPoints: 100,
            createdBy: String(t.userId)
         }));
         setTests(mappedTests);
       } catch (err) {
         console.error("Failed to fetch tests", err);
       } finally {
         setLoading(false);
       }
    })();
  }, []);

  const [assignedSessions, setAssignedSessions] = useState<any[]>([]);
  useEffect(() => {
    if (activeTab === 'assigned') {
      (async () => {
        try {
          const res = await api.get<any[]>('/api/Sessions');
          setAssignedSessions(res);
        } catch (err) {
          console.error("Failed to fetch sessions", err);
        }
      })();
    }
  }, [activeTab]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'type' | 'info' | 'content' | 'summary'>('type');
  const [selectedType, setSelectedType] = useState<Test['type'] | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [isLoadingTestDetails, setIsLoadingTestDetails] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [selectedSessionResult, setSelectedSessionResult] = useState<any | null>(null);
  const [isLoadingSessionResult, setIsLoadingSessionResult] = useState(false);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [formData, setFormData] = useState({
    title: '',
    duration: 60,
    description: '',
    deadline: '',
    subject: '',
    questions: [] as Question[],
    assignedCandidates: [] as string[],
  });

  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion>({
    text: '',
    type: 'mcq',
    options: ['', '', '', ''],
    optionIds: [null, null, null, null],
    correctAnswer: '',
    correctAnswerIndex: -1,
    points: 10,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      duration: 60,
      description: '',
      deadline: '',
      subject: '',
      questions: [],
      assignedCandidates: [],
    });
    setSelectedType(null);
    setEditingId(null);
    setModalStep('type');
    setCurrentQuestion({
      text: '',
      type: 'mcq',
      options: ['', '', '', ''],
      optionIds: [null, null, null, null],
      correctAnswer: '',
      correctAnswerIndex: -1,
      points: 10,
    });
    setEditingQuestionIndex(null);
  };

  const isStepValid = () => {
    if (modalStep === 'info') return formData.title.trim() !== '' && formData.description.trim() !== '';
    if (modalStep === 'content') {
      if (selectedType === 'quiz') return formData.questions.length > 0;
      return formData.subject.trim() !== '';
    }
    return true;
  };

  const handleCreateTest = async () => {
    console.log('handleCreateTest triggered', { formData, selectedType, editingId });
    if (!formData.title.trim() || !formData.description.trim() || !selectedType) {
      toast.error('Informations incomplètes');
      return;
    }

    const loadingToast = toast.loading('Création du test et des questions...');

    try {
      const questionIds: number[] = [];

      // 1. Create or Update Questions
      if (selectedType === 'quiz') {
        for (const q of formData.questions) {
          const isExisting = !isNaN(Number(q.id)) && Number(q.id) < 1000000000000;
          
          try {
            if (isExisting) {
               const qEditData = {
                 Question: {
                   idQuestion: parseInt(q.id),
                   NameQuestion: q.text,
                   Durée: "10",
                   Score: q.points.toString(),
                   IdSection: null,
                   IdLevel: null,
                   Active: true
                 },
                 Answers: q.options?.map((opt, idx) => ({
                   Id: q.optionIds?.[idx] || null,
                   Label: opt,
                   Type: "radio",
                   Name: opt,
                   IsCorrect: opt === q.correctAnswer ? 1 : 0
                 }))
               };
               console.log('[handleCreateTest] Updating existing question', q.id);
               const updatedQ = await api.post<any>('/api/Questions/QuestionAndAnswersEdit', qEditData);
               const qId = updatedQ?.idQuestion || updatedQ?.IdQuestion;
               if (qId) questionIds.push(qId);
            } else {
              const qData = {
                Question: {
                  NameQuestion: q.text,
                  Durée: "10", 
                  Score: q.points.toString(),
                  IdSection: null, 
                  IdLevel: null,   
                  Active: true
                },
                Answers: q.options?.map(opt => ({
                  Label: opt,
                  Type: "radio",
                  Name: opt,
                  IsCorrect: opt === q.correctAnswer ? 1 : 0
                }))
              };
              console.log('[handleCreateTest] Creating new question');
              const createdQ = await api.post<any>('/api/Questions/QuestionAndAnswers', qData);
              const qId = createdQ?.idQuestion || createdQ?.IdQuestion;
              if (qId) questionIds.push(qId);
            }
          } catch (qErr) {
            console.error(`Failed to process question: ${q.text}`, qErr);
            toast.error(`Erreur sur une question: ${q.text}`);
          }
        }
      } else {
        // For Redaction, Code, Design: Create one question with the subject
        const qData = {
          Question: {
            NameQuestion: formData.subject || formData.description || "Réalisez l'épreuve demandée",
            Durée: formData.duration.toString(), 
            Score: "100",
            Active: true
          },
          Answers: [] 
        };
        try {
          console.log('[handleCreateTest] Creating single question for non-quiz');
          const createdQ = await api.post<any>('/api/Questions/QuestionAndAnswers', qData);
          const qId = createdQ?.idQuestion || createdQ?.IdQuestion;
          if (qId) questionIds.push(qId);
        } catch (qErr) {
          console.error("Failed to create subject question", qErr);
        }
      }
      console.log('All questions processed', { questionIds });

      // 2. Create or Update the Test (Examan) linked with questions
      const examWithQs = {
        UserId: parseInt(currentUserId) || 1,
        Titre: formData.title,
        Description: formData.description,
        Active: true,
        DateCreation: new Date().toISOString(),
        Duration: formData.duration,
        QuestionListId: questionIds
      };

      let examId: number | undefined;
      if (editingId) {
        console.log('[handleCreateTest] Updating exam', editingId);
        await api.put(`/api/DetailsExamans/UpdateExamanWithQuestions/${editingId}`, examWithQs);
        toast.success('Test mis à jour avec succès', { id: loadingToast });
        examId = parseInt(editingId);
      } else {
        console.log('[handleCreateTest] Adding new exam');
        const createdExam = await api.post<any>('/api/DetailsExamans/AddExamanWithQuestions', examWithQs);
        console.log('Test created', createdExam);
        toast.success('Test créé et sauvegardé avec succès', { id: loadingToast });
        examId = createdExam?.idExaman || createdExam?.IdExaman;
      }
      
      console.log('Finalizing test creation', { examId });
      
      if (examId && formData.assignedCandidates.length > 0) {
        console.log('Assigning test to candidates', { examId, count: formData.assignedCandidates.length });
        for (const candidateId of formData.assignedCandidates) {
          try {
             console.log(`[handleCreateTest] Assigning to candidate ${candidateId}`);
             const sessionRes: any = await api.post('/api/Sessions', {
               ApplicationId: parseInt(candidateId),
               ExamanId: examId,
               Deadline: formData.deadline ? new Date(formData.deadline).toISOString() : new Date(Date.now() + 86400000).toISOString()
             });
             console.log(`Test assigned to candidate ${candidateId}`, sessionRes);
             if (sessionRes?.emailSent === false) {
               toast.warning(`Test assigné mais email non envoyé pour un candidat${sessionRes?.emailError ? ` (${sessionRes.emailError})` : ''}`);
             }
          } catch (sessErr: any) {
             console.error(`Failed to assign test to candidate ${candidateId}`, sessErr);
             toast.error(sessErr?.message || `Erreur d'affectation pour un candidat`);
          }
        }
      }

      const newTest: Test = {
        id: String(examId || Date.now()),
        title: formData.title,
        type: selectedType,
        duration: formData.duration,
        description: formData.description,
        totalPoints: 100,
        createdBy: currentUserId,
      };

      if (editingId) {
        setTests(prev => prev.map(t => t.id === editingId ? newTest : t));
      } else {
        setTests([newTest, ...tests]);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur lors de la création du test', { id: loadingToast });
    }
  };

  const handleEditTest = async (test: Test, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const loadingToast = toast.loading('Chargement des détails du test...');
    try {
      const fullTest = await api.get<any>(`/api/Examans/${test.id}`);
      
      setEditingId(test.id);
      setSelectedType(test.type);
      
      const questions = (fullTest.detailsExamen || []).map((d: any) => {
        const q = d.idQuestionNavigation;
        if (!q) return null;
        return {
          id: String(q.idQuestion),
          text: q.nameQuestion,
          type: q.answers && q.answers.length === 2 && (q.answers[0].label === 'Vrai' || q.answers[0].label === 'Faux') ? 'boolean' : 'mcq',
          options: q.answers?.map((a: any) => a.label) || [],
          optionIds: q.answers?.map((a: any) => a.id) || [],
          correctAnswer: q.answers?.find((a: any) => a.isCorrect === 1)?.label || '',
          points: parseInt(q.score) || 10
        };
      }).filter((q: any) => q !== null);

      setFormData({
        title: fullTest.titre || test.title,
        duration: test.duration,
        description: fullTest.description || test.description,
        deadline: '',
        subject: fullTest.description || '', // For non-quiz, subject is often in description
        questions: questions,
        assignedCandidates: [],
      });
      
      setModalStep('info');
      setIsModalOpen(true);
      toast.dismiss(loadingToast);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des détails', { id: loadingToast });
    }
  };

  const handleViewTest = async (test: Test, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // First, set the test with basic info and show loader
    setSelectedTest(test);
    setIsLoadingTestDetails(true);
    
    try {
      const fullTest = await api.get<any>(`/api/Examans/${test.id}`);
      
      const questions = (fullTest.detailsExamen || []).map((d: any) => {
        const q = d.idQuestionNavigation;
        if (!q) return null;
        return {
          id: String(q.idQuestion),
          text: q.nameQuestion,
          type: q.answers && q.answers.length === 2 && (q.answers[0].label === 'Vrai' || q.answers[0].label === 'Faux') ? 'boolean' : 'mcq',
          options: q.answers?.map((a: any) => a.label || a.name) || [],
          optionIds: q.answers?.map((a: any) => a.id) || [],
          correctAnswer: q.answers?.find((a: any) => a.isCorrect === 1)?.label || q.answers?.find((a: any) => a.isCorrect === 1)?.name || '',
          points: parseInt(q.score) || 10
        };
      }).filter((q: any) => q !== null);

      setSelectedTest(prev => prev ? {
        ...prev,
        description: fullTest.description || test.description,
        duration: fullTest.duration || test.duration,
        questions: questions
      } : null);
    } catch (err) {
      console.error("Failed to load test details", err);
      toast.error('Erreur lors du chargement des détails du test');
    } finally {
      setIsLoadingTestDetails(false);
    }
  };

  const handleDeleteTest = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (window.confirm('Supprimer définitivement ce test ?')) {
      const loadingToast = toast.loading('Suppression en cours...');
      try {
        await api.delete(`/api/Examans/${id}`);
        setTests(tests.filter(t => t.id !== id));
        setSelectedTest(null);
        toast.success('Test supprimé avec succès', { id: loadingToast });
      } catch (err) {
        console.error("Delete failed", err);
        toast.error('Erreur lors de la suppression', { id: loadingToast });
      }
    }
  };

  const handleAffectTest = async (test: Test, e: React.MouseEvent) => {
    e.stopPropagation();
    const loadingToast = toast.loading('Préparation de l\'affectation...');
    try {
      const fullTest = await api.get<any>(`/api/Examans/${test.id}`);
      
      setEditingId(test.id);
      setSelectedType(test.type);
      
      const questions = (fullTest.detailsExamen || []).map((d: any) => {
        const q = d.idQuestionNavigation;
        if (!q) return null;
        return {
          id: String(q.idQuestion),
          text: q.nameQuestion,
          type: q.answers && q.answers.length === 2 && (q.answers[0].label === 'Vrai' || q.answers[0].label === 'Faux') ? 'boolean' : 'mcq',
          options: q.answers?.map((a: any) => a.label) || [],
          correctAnswer: q.answers?.find((a: any) => a.isCorrect === 1)?.label || '',
          points: parseInt(q.score) || 10
        };
      }).filter((q: any) => q !== null);

      setFormData({
        title: fullTest.titre || test.title,
        duration: test.duration,
        description: fullTest.description || test.description,
        deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        subject: fullTest.description || '',
        questions: questions,
        assignedCandidates: [],
      });
      
      setModalStep('summary'); // Direct to summary for assignment
      setIsModalOpen(true);
      toast.dismiss(loadingToast);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la préparation', { id: loadingToast });
    }
  };

  const toggleCandidate = (id: string) => {
    setFormData(prev => ({
      ...prev,
      assignedCandidates: prev.assignedCandidates.includes(id)
        ? prev.assignedCandidates.filter(cId => cId !== id)
        : [...prev.assignedCandidates, id],
    }));
  };

  const handleEditQuestionUI = (index: number) => {
    const q = formData.questions[index];
    setEditingQuestionIndex(index);
    setCurrentQuestion({
      text: q.text,
      type: q.type,
      options: q.options || (q.type === 'boolean' ? ['Vrai', 'Faux'] : ['', '', '', '']),
      optionIds: q.optionIds || (q.type === 'boolean' ? [null, null] : [null, null, null, null]),
      correctAnswer: q.correctAnswer,
      correctAnswerIndex: (q.options || []).indexOf(q.correctAnswer),
      points: q.points,
    });
  };

  const addQuestion = () => {
    if (!currentQuestion.text?.trim() || !currentQuestion.correctAnswer?.trim()) {
      toast.error('Veuillez saisir la question et sélectionner la bonne réponse');
      return;
    }

    const validOptions =
      currentQuestion.type === 'boolean'
        ? ['Vrai', 'Faux']
        : currentQuestion.options?.filter(o => o.trim() !== '') || [];

    if (currentQuestion.type === 'mcq' && validOptions.length < 2) {
      toast.error('Veuillez saisir au moins deux options');
      return;
    }

    const q: Question = {
      id: editingQuestionIndex !== null ? formData.questions[editingQuestionIndex].id : Date.now().toString(),
      text: currentQuestion.text,
      type: currentQuestion.type as 'mcq' | 'boolean',
      options: validOptions,
      optionIds: currentQuestion.optionIds,
      correctAnswer: currentQuestion.correctAnswer,
      points: currentQuestion.points ?? 10,
    };

    if (editingQuestionIndex !== null) {
      const updatedQuestions = [...formData.questions];
      updatedQuestions[editingQuestionIndex] = q;
      setFormData({
        ...formData,
        questions: updatedQuestions,
      });
      setEditingQuestionIndex(null);
      toast.success('Question mise à jour');
    } else {
      setFormData({
        ...formData,
        questions: [...formData.questions, q],
      });
      toast.success('Question ajoutée');
    }

    setCurrentQuestion({
      text: '',
      type: currentQuestion.type,
      options: currentQuestion.type === 'boolean' ? ['Vrai', 'Faux'] : ['', '', '', ''],
      optionIds: currentQuestion.type === 'boolean' ? [null, null] : [null, null, null, null],
      correctAnswer: '',
      correctAnswerIndex: -1,
      points: 10,
    });
  };

  const filteredTests = useMemo(() => {
    return tests.filter(t => {
      if (filterType === 'all') return true;
      return t.type === filterType;
    });
  }, [tests, filterType]);

  const paginatedTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);

  const typeIcons = {
    quiz: { icon: ListChecks, label: 'Quiz / QCM', desc: 'Questions interactives', color: 'from-blue-500 to-indigo-600' },
    redaction: { icon: PenTool, label: 'Rédaction', desc: 'Analyse & Texte', color: 'from-orange-400 to-red-500' },
    code: { icon: Code, label: 'Technique', desc: 'Programmation', color: 'from-emerald-400 to-teal-600' },
    design: { icon: Palette, label: 'Design', desc: 'UX/UI & Création', color: 'from-purple-500 to-pink-600' },
  };

  // --- Génération de quiz par IA (à partir des compétences détectées d'un CV) ---
  // ⚠️ Ces hooks DOIVENT rester avant le "if (selectedTest) return" ci-dessous : des hooks
  // déclarés après un retour anticipé ne s'exécutent pas à chaque rendu et React plante
  // ("Rendered fewer hooks than expected") dès qu'on clique sur un test pour voir son contenu.
  const [quizSkills, setQuizSkills] = useState('');
  const [quizCount, setQuizCount] = useState(5);
  const [quizLoading, setQuizLoading] = useState(false);
  const [showQuizGen, setShowQuizGen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<
    { question: string; skill: string; options: string[]; correct_index: number }[]
  >([]);
  // Mode "passer le quiz" (le candidat répond -> on calcule un score)
  const [quizMode, setQuizMode] = useState<'view' | 'take'>('view');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);

  if (selectedTest) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen"
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSelectedTest(null)}
              className="h-12 w-12 bg-secondary text-foreground rounded-xl flex items-center justify-center hover:opacity-90 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="px-2 py-0.5 rounded-lg text-[9px] font-bold text-white w-fit mb-2 bg-gradient-to-br from-[#EF4444] to-[#F87171]">
                {selectedTest.type}
              </div>
              <h2 className="text-xl font-semibold tracking-tight">{selectedTest.title}</h2>
            </div>
          </div>
          {(!isHR || selectedTest.createdBy === currentUserId) && (
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => handleAffectTest(selectedTest, e)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Affecter ce test
              </button>
              <button 
                onClick={() => handleEditTest(selectedTest)}
                className="p-3 bg-secondary hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm"
                title="Modifier"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleDeleteTest(selectedTest.id)}
                className="p-3 bg-secondary hover:bg-error hover:text-white rounded-xl transition-all shadow-sm text-error"
                title="Supprimer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-card p-6 rounded-3xl border border-border/40 shadow-sm">
              <h3 className="text-xl font-extrabold tracking-tight mb-6">Contenu du test</h3>

              {selectedTest.type === 'quiz' ? (
                <div className="space-y-4">
                  {selectedTest.questions?.map((q, i) => (
                    <div key={q.id || i} className="p-4 bg-secondary/15 rounded-xl border border-border/40">
                      <p className="text-base font-bold mb-3">
                        {i + 1}. {q.text}
                      </p>

                      <div className="flex gap-2 flex-wrap">
                        {q.options?.map(opt => (
                          <div
                            key={opt}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border ${opt === q.correctAnswer
                                ? 'bg-primary text-white border-primary'
                                : 'bg-background border-border/50'
                              }`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(isLoadingTestDetails || (!selectedTest.questions && selectedTest.type === 'quiz')) && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center text-muted-foreground italic">
                      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                      <p>Chargement des questions...</p>
                    </div>
                  )}
                  {(!isLoadingTestDetails && selectedTest.questions && selectedTest.questions.length === 0) && (
                    <div className="py-12 text-center text-muted-foreground italic">
                      Aucune question n'a été ajoutée à ce test.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-secondary/15 rounded-xl border border-border/40 italic text-base font-medium leading-relaxed">
                  {selectedTest.subject || selectedTest.description}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-card p-6 rounded-3xl border border-border/40 shadow-sm">
              <h4 className="text-xs font-bold text-muted-foreground mb-4">Paramètres</h4>

              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-xl border border-border/40">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground">Durée</p>
                    <p className="text-lg font-extrabold">{selectedTest.duration} min</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-xl border border-border/40">
                  <Award className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground">Points</p>
                    <p className="text-lg font-extrabold">{selectedTest.totalPoints} pts</p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </motion.div>
    );
  }

  const startTakeQuiz = () => {
    setQuizMode('take');
    setQuizAnswers({});
    setQuizScore(null);
  };
  const submitQuiz = () => {
    if (Object.keys(quizAnswers).length < quizQuestions.length) {
      toast.error('Répondez à toutes les questions avant de terminer.');
      return;
    }
    const correct = quizQuestions.reduce(
      (acc, q, i) => acc + (quizAnswers[i] === q.correct_index ? 1 : 0),
      0
    );
    const score = Math.round((correct / quizQuestions.length) * 100);
    setQuizScore(score);
    toast.success(`Score : ${score}% (${correct}/${quizQuestions.length})`);
  };

  // Transforme le quiz généré en VRAI test (Examan) que l'ÉTUDIANT passera depuis son
  // compte : on pré-remplit le formulaire de création existant, puis le RH choisit le
  // candidat et valide -> le parcours habituel crée le test + l'affecte (Session).
  // L'étudiant le voit dans "Mes Tests", le passe, et obtient son score.
  const createTestFromQuiz = () => {
    if (!quizQuestions.length) { toast.error("Générez d'abord un quiz."); return; }
    const questions: Question[] = quizQuestions.map((q, i) => ({
      id: `gen-${Date.now()}-${i}`,
      text: q.question,
      type: 'mcq',
      options: q.options,
      correctAnswer: q.options[q.correct_index] ?? q.options[0] ?? '',
      points: 10,
    }));
    const firstSkill = quizSkills.split(',')[0]?.trim() || 'compétences';
    setSelectedType('quiz');
    setEditingId(null);
    setFormData((f) => ({
      ...f,
      title: `Quiz IA — ${firstSkill}`,
      description: `Quiz généré par IA (compétences : ${quizSkills}).`,
      duration: 30,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      subject: '',
      questions,
      assignedCandidates: [],
    }));
    // On passe par l'étape "Contenu" (et non directement "Récapitulatif") pour que le RH
    // puisse modifier/supprimer les questions générées par l'IA avant d'assigner le test.
    setModalStep('content');
    setIsModalOpen(true);
    toast.success('Quiz prêt — modifiez les questions si besoin, puis choisissez le candidat.');
  };

  const generateQuiz = async () => {
    const skills = quizSkills.split(',').map((s) => s.trim()).filter(Boolean);
    if (!skills.length) {
      toast.error('Saisissez au moins une compétence (séparées par des virgules).');
      return;
    }
    setQuizLoading(true);
    setQuizQuestions([]);
    setQuizMode('view');
    setQuizAnswers({});
    setQuizScore(null);
    try {
      const data = await api.post<any>('/api/Analysis/generate-quiz', {
        skills,
        numQuestions: quizCount,
      });
      if (data?.error) { toast.error(data.error); return; }
      const qs = Array.isArray(data.questions) ? data.questions : [];
      setQuizQuestions(
        qs.map((q: any) => ({
          question: q.question,
          skill: q.skill,
          options: q.options || [],
          correct_index: q.correctIndex ?? q.correct_index ?? 0,
        }))
      );
      if (!qs.length) toast.error('Aucune question générée.');
      else toast.success(`${qs.length} question(s) générée(s) par l'IA.`);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la génération du quiz.');
    } finally {
      setQuizLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
      {/* Header with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Gestion des tests</h1>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setActiveTab('models')}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'models' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
            >
              Modèles de tests
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'assigned' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
            >
              Tests Affectés
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex bg-secondary/50 p-1 rounded-xl border border-border/40">
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
              <List className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={() => setActiveTab('assigned')}
            className="hidden lg:flex h-12 px-5 bg-secondary text-foreground rounded-xl font-bold text-sm hover:bg-secondary/80 transition-all items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-primary" />
            Suivre les tests
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-12 px-6 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 flex items-center gap-3"
          >
            <Plus className="w-5 h-5" />
            Nouveau test
          </button>
        </div>
      </div>

      {/* Génération automatique de quiz par IA (compétences détectées d'un CV) */}
      <div className="bg-card rounded-3xl border border-border/40 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#F87171] text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold tracking-tight">Générer un quiz par IA</h3>
              <p className="text-sm text-muted-foreground">À partir des compétences détectées d'un CV</p>
            </div>
          </div>
          <button
            onClick={() => setShowQuizGen((v) => !v)}
            className="px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-bold hover:bg-secondary/80 transition-all"
          >
            {showQuizGen ? 'Masquer' : 'Ouvrir'}
          </button>
        </div>

        {showQuizGen && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-muted-foreground">
                Compétences (séparées par des virgules)
              </label>
              <textarea
                value={quizSkills}
                onChange={(e) => setQuizSkills(e.target.value)}
                rows={2}
                placeholder="Ex : Java, Spring Boot, SQL, Docker, React"
                className="w-full px-4 py-2 rounded-xl bg-secondary/40 border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="block text-sm font-semibold mb-1 text-muted-foreground">Nb de questions</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={quizCount}
                  onChange={(e) => setQuizCount(Number(e.target.value) || 5)}
                  className="w-28 px-4 py-2 rounded-xl bg-secondary/40 border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={generateQuiz}
                disabled={quizLoading}
                className="h-11 px-6 bg-gradient-to-r from-[#DC2626] to-[#F87171] text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60 flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {quizLoading ? 'Génération…' : 'Générer le quiz'}
              </button>
            </div>

            {quizQuestions.length > 0 && (
              <div className="space-y-4 pt-2">
                {/* Barre : voir les réponses (RH) / passer le quiz (candidat) + score */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => { setQuizMode('view'); setQuizScore(null); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${quizMode === 'view' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                    >
                      Voir les réponses
                    </button>
                    <button
                      onClick={startTakeQuiz}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${quizMode === 'take' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                    >
                      Aperçu (répondre)
                    </button>
                    <button
                      onClick={createTestFromQuiz}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[#16A34A] text-white hover:opacity-90 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Créer le test (à assigner au candidat)
                    </button>
                  </div>
                  {quizScore !== null && (
                    <span className="text-sm font-bold text-[#16A34A]">Score : {quizScore}%</span>
                  )}
                </div>

                {quizQuestions.map((q, i) => {
                  const answered = quizAnswers[i];
                  const submitted = quizScore !== null;
                  return (
                    <div key={i} className="p-4 bg-secondary/15 rounded-xl border border-border/40">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-semibold">{i + 1}. {q.question}</p>
                        {q.skill && (
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-lg whitespace-nowrap">{q.skill}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => {
                          let cls = 'bg-card border-border/40';
                          if (quizMode === 'view') {
                            if (oi === q.correct_index) cls = 'bg-[#16A34A]/10 border-[#16A34A]/40 text-[#16A34A] font-semibold';
                          } else if (submitted) {
                            if (oi === q.correct_index) cls = 'bg-[#16A34A]/10 border-[#16A34A]/40 text-[#16A34A] font-semibold';
                            else if (oi === answered) cls = 'bg-[#DC2626]/10 border-[#DC2626]/40 text-[#DC2626] font-semibold';
                          } else if (oi === answered) {
                            cls = 'bg-primary/10 border-primary/40 text-primary font-semibold';
                          }
                          const clickable = quizMode === 'take' && !submitted;
                          return (
                            <button
                              type="button"
                              key={oi}
                              disabled={!clickable}
                              onClick={() => clickable && setQuizAnswers((a) => ({ ...a, [i]: oi }))}
                              className={`text-left px-3 py-2 rounded-lg text-sm border transition-all ${cls} ${clickable ? 'hover:border-primary/50 cursor-pointer' : 'cursor-default'}`}
                            >
                              {String.fromCharCode(65 + oi)}. {opt}
                              {(quizMode === 'view' || submitted) && oi === q.correct_index && <CheckCircle className="inline w-4 h-4 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {quizMode === 'take' && quizScore === null && (
                  <button
                    onClick={submitQuiz}
                    className="h-11 px-6 bg-[#16A34A] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Terminer le quiz
                  </button>
                )}
                {quizMode === 'take' && quizScore !== null && (
                  <div className="p-4 rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/30 flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-bold text-[#16A34A]">Résultat du candidat : {quizScore}%</p>
                    <button onClick={startTakeQuiz} className="text-sm underline text-muted-foreground">Recommencer</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'models' ? (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2">Filtres:</span>
            {[
              { id: 'all', label: 'Tous', icon: LayoutGrid },
              { id: 'quiz', label: 'Quiz', icon: ListChecks },
              { id: 'code', label: 'Code', icon: Code },
              { id: 'redaction', label: 'Rédaction', icon: PenTool },
              { id: 'design', label: 'Design', icon: Palette },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterType === f.id ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border/50 text-muted-foreground hover:border-primary/30'}`}
              >
                <f.icon className="w-4 h-4" />
                {f.label}
              </button>
            ))}
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedTests.map((test, index) => (
                <motion.div
                  layout
                  key={test.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-card border border-border/50 rounded-3xl p-5 shadow-sm hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col min-h-[220px]"
                  onClick={(e) => handleViewTest(test, e)}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform bg-gradient-to-br ${typeIcons[test.type as keyof typeof typeIcons]?.color || 'from-primary to-primary/80'}`}>
                      {test.type === 'quiz' && <ListChecks className="w-6 h-6" />}
                      {test.type === 'redaction' && <PenTool className="w-6 h-6" />}
                      {test.type === 'code' && <Code className="w-6 h-6" />}
                      {test.type === 'design' && <Palette className="w-6 h-6" />}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(!isHR || test.createdBy === currentUserId) && (
                        <button
                          onClick={(e) => handleAffectTest(test, e)}
                          className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
                          title="Affecter à un candidat"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleEditTest(test, e)}
                        className="p-2 bg-secondary/80 text-muted-foreground hover:bg-primary hover:text-white rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTest(test.id, e)}
                        className="p-2 bg-secondary/80 text-error hover:bg-error hover:text-white rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                      {test.title}
                    </h3>
                    <p className="text-muted-foreground text-[13px] font-medium mt-1 line-clamp-2">
                      {test.description}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Durée</span>
                        <span className="font-bold text-xs">{test.duration} min</span>
                      </div>
                      <div className="w-px h-6 bg-border/50" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Format</span>
                        <span className="font-bold text-xs capitalize">{test.type}</span>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedTests.map((test) => (
                <motion.div
                  layout
                  key={test.id}
                  onClick={(e) => handleViewTest(test, e)}
                  className="group bg-card border border-border/40 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${typeIcons[test.type as keyof typeof typeIcons]?.color || 'from-primary to-primary/80'} shrink-0`}>
                      {test.type === 'quiz' && <ListChecks className="w-5 h-5" />}
                      {test.type === 'redaction' && <PenTool className="w-5 h-5" />}
                      {test.type === 'code' && <Code className="w-5 h-5" />}
                      {test.type === 'design' && <Palette className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold group-hover:text-primary transition-colors">{test.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{test.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-bold">{test.duration} min</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{test.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleAffectTest(test, e)}
                        className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleEditTest(test, e)}
                        className="p-2 bg-secondary hover:bg-primary hover:text-white rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTest(test.id, e)}
                        className="p-2 bg-secondary hover:bg-error hover:text-white rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary disabled:opacity-50 transition-all hover:bg-secondary/80"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary disabled:opacity-50 transition-all hover:bg-secondary/80"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Assigned Tests View */
        <div className="space-y-4">
          {assignedSessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {assignedSessions.map((session, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={session.sessionId}
                  className="bg-card border border-border/50 rounded-2xl p-5 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {session.application?.nameApplication?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h4 className="font-bold text-base">{session.application?.nameApplication || 'Candidat'}</h4>
                      <p className="text-xs text-muted-foreground">{session.application?.email}</p>
                    </div>
                    <div className="w-px h-10 bg-border/50 hidden md:block" />
                    <div className="hidden md:block">
                      <p className="text-[10px] font-extrabold text-muted-foreground uppercase">Test Assigné</p>
                      <p className="text-sm font-bold">{session.examn?.titre || 'Modèle de Test'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                     <div className="text-right">
                       <p className="text-[10px] font-extrabold text-muted-foreground uppercase">Échéance</p>
                       <div className="flex items-center gap-1.5 text-error font-bold text-sm">
                         <Clock className="w-3 h-3" />
                         {new Date(session.expiresAt).toLocaleDateString()}
                       </div>
                     </div>
                     
                     {session.sessionState && (
                       <div className="text-right min-w-[60px]">
                         <p className="text-[10px] font-extrabold text-muted-foreground uppercase">Score</p>
                         <p className="text-sm font-black text-primary">
                           {session.score ?? 0}
                           <span className="text-[10px] text-muted-foreground ml-0.5">/ 100</span>
                         </p>
                       </div>
                     )}

                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${session.sessionState ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {session.sessionState ? 'Terminé' : 'En cours'}
                        </div>
                        <div className="flex items-center gap-2">
                          {session.sessionState && (
                            <button
                              onClick={async () => {
                                setIsLoadingSessionResult(true);
                                try {
                                  const res = await api.get(`/api/Sessions/result/${session.sessionId}`);
                                  setSelectedSessionResult(res);
                                } catch (err) {
                                  toast.error("Erreur lors du chargement des détails");
                                } finally {
                                  setIsLoadingSessionResult(false);
                                }
                              }}
                              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              Voir détails
                            </button>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm('Voulez-vous vraiment supprimer cette affectation ?')) return;
                              try {
                                await api.delete(`/api/Sessions/${session.sessionId}`);
                                toast.success('Affectation supprimée');
                                setAssignedSessions(prev => prev.filter(s => s.sessionId !== session.sessionId));
                              } catch (err) {
                                toast.error('Erreur lors de la suppression');
                              }
                            }}
                            className="p-1.5 bg-secondary text-error hover:bg-error hover:text-white rounded-lg transition-all"
                            title="Supprimer l'affectation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                   </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-secondary/10 rounded-[3rem] border-2 border-dashed border-border/40">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Aucun test n'a été affecté pour le moment.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'models' && tests.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-secondary/10 rounded-[3rem] border-2 border-dashed border-border/40">
          <div className="w-20 h-20 bg-background rounded-3xl flex items-center justify-center mb-6 shadow-sm">
            <Plus className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-semibold text-foreground/80 mb-2">Aucun test disponible</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm mb-8">
            Commencez par créer votre premier modèle de test pour évaluer vos candidats.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-12 px-8 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 flex items-center gap-3"
          >
            <Plus className="w-5 h-5" />
            Nouveau test
          </button>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold tracking-tight">
                      {modalStep === 'type' && 'Format du test'}
                      {modalStep === 'info' && 'Informations générales'}
                      {modalStep === 'content' &&
                        (selectedType === 'quiz' ? 'Création des questions' : 'Sujet du test')}
                      {modalStep === 'summary' && 'Récapitulatif'}
                    </h2>

                    <div className="flex gap-2 mt-2">
                      {['type', 'info', 'content', 'summary'].map((s, i) => (
                        <div
                          key={s}
                          className={`h-1 rounded-full flex-1 min-w-[40px] transition-all ${['type', 'info', 'content', 'summary'].indexOf(modalStep) >= i
                              ? 'bg-primary'
                              : 'bg-secondary'
                            }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="p-2 bg-secondary rounded-lg hover:bg-error hover:text-white transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {modalStep === 'type' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {(Object.entries(typeIcons) as [Test['type'], any][]).map(([type, info]) => {
                      const Icon = info.icon;

                      return (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedType(type);
                            setModalStep('info');
                          }}
                          className="group relative p-8 bg-background border border-border/60 hover:border-primary/40 rounded-3xl transition-all text-left overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-6 h-6 text-primary/20" />
                          </div>

                          <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EF4444] to-[#F87171] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Icon className="w-8 h-8" />
                            </div>

                            <div>
                              <p className="text-xl font-bold tracking-tight text-foreground">{info.label}</p>
                              <p className="text-sm font-medium text-muted-foreground mt-1">{info.desc}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-2 text-primary font-bold text-xs opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            Choisir ce format <ChevronRight className="w-3 h-3" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {modalStep === 'info' && (
                  <div className="space-y-6">
                    <div className="space-y-6">
                      <div className="w-full">
                        <label className="text-xs font-bold text-muted-foreground block mb-2 uppercase tracking-widest">
                          Titre du test
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Evaluation Frontend React"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full h-14 px-5 bg-background border border-border/80 rounded-2xl outline-none focus:border-primary transition-all font-semibold text-lg"
                        />
                      </div>

                      <div className="w-full">
                        <label className="text-xs font-bold text-muted-foreground block mb-2 uppercase tracking-widest">
                          Description / Consignes
                        </label>
                        <textarea
                          placeholder="Décrivez l'objectif de ce test..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full h-32 p-5 bg-background border border-border/80 rounded-2xl outline-none focus:border-primary transition-all font-medium text-base resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-2 uppercase tracking-widest">
                            Durée (minutes)
                          </label>
                          <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              type="number"
                              value={formData.duration}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData({ ...formData, duration: val === '' ? 0 : parseInt(val) });
                              }}
                              className="w-full h-12 pl-12 pr-4 bg-background border border-border/80 rounded-xl outline-none focus:border-primary transition-all font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-2 uppercase tracking-widest">
                            Date limite (optionnel)
                          </label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              type="date"
                              value={formData.deadline}
                              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                              className="w-full h-12 pl-12 pr-4 bg-background border border-border/80 rounded-xl outline-none focus:border-primary transition-all font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border/30">
                      <button
                        onClick={() => (editingId ? setIsModalOpen(false) : setModalStep('type'))}
                        className="w-12 h-12 flex items-center justify-center bg-secondary rounded-full hover:bg-secondary/80 transition-all"
                      >
                        {editingId ? <X className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                      </button>

                      <button
                        onClick={() =>
                          isStepValid()
                            ? setModalStep('content')
                            : toast.error('Veuillez remplir tous les champs obligatoires')
                        }
                        className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-lg ${isStepValid()
                            ? 'bg-primary text-white shadow-primary/20 hover:opacity-90'
                            : 'bg-secondary text-muted-foreground cursor-not-allowed'
                          }`}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                )}

                {modalStep === 'content' && (
                  <div className="space-y-6">
                    {selectedType === 'quiz' ? (
                      <div className="space-y-6">
                        <div className="bg-secondary/10 p-6 rounded-3xl border border-border/50 space-y-5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold flex items-center gap-2">
                              <Plus className="w-4 h-4 text-primary" />
                              Détails de la question
                            </h4>

                            <div className="flex bg-secondary/50 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() =>
                                  setCurrentQuestion({
                                    ...currentQuestion,
                                    type: 'mcq',
                                    options: ['', '', '', ''],
                                    correctAnswer: '',
                                    correctAnswerIndex: -1,
                                  })
                                }
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentQuestion.type === 'mcq'
                                    ? 'bg-white shadow-sm text-primary'
                                    : 'text-muted-foreground'
                                  }`}
                              >
                                QCM (Radio)
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setCurrentQuestion({
                                    ...currentQuestion,
                                    type: 'boolean',
                                    options: ['Vrai', 'Faux'],
                                    correctAnswer: '',
                                    correctAnswerIndex: -1,
                                  })
                                }
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentQuestion.type === 'boolean'
                                    ? 'bg-white shadow-sm text-primary'
                                    : 'text-muted-foreground'
                                  }`}
                              >
                                Vrai / Faux
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            placeholder="Saisissez votre question..."
                            value={currentQuestion.text || ''}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                            className="w-full h-12 px-4 bg-background rounded-xl font-medium border border-border/80 outline-none focus:border-primary transition-all text-base"
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentQuestion.type === 'mcq' ? (
                              currentQuestion.options?.map((opt, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCurrentQuestion({
                                        ...currentQuestion,
                                        correctAnswer: opt,
                                        correctAnswerIndex: i,
                                      })
                                    }
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${currentQuestion.correctAnswerIndex === i
                                        ? 'bg-primary border-primary shadow-sm shadow-primary/30'
                                        : 'border-border/80 bg-white'
                                      }`}
                                  >
                                    {currentQuestion.correctAnswerIndex === i && (
                                      <CheckCircle className="w-4 h-4 text-white" />
                                    )}
                                  </button>

                                  <input
                                    type="text"
                                    placeholder={`Option ${i + 1}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...(currentQuestion.options || [])];
                                      newOpts[i] = e.target.value;

                                      const isCorrect = currentQuestion.correctAnswerIndex === i;

                                      setCurrentQuestion({
                                        ...currentQuestion,
                                        options: newOpts,
                                        correctAnswer: isCorrect ? e.target.value : currentQuestion.correctAnswer,
                                      });
                                    }}
                                    className="w-full h-11 px-4 bg-background rounded-xl text-sm border border-border/80 outline-none focus:border-primary transition-all font-medium"
                                  />
                                </div>
                              ))
                            ) : (
                              ['Vrai', 'Faux'].map((opt, i) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    setCurrentQuestion({
                                      ...currentQuestion,
                                      correctAnswer: opt,
                                      correctAnswerIndex: i,
                                    })
                                  }
                                  className={`h-14 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-3 ${currentQuestion.correctAnswerIndex === i
                                      ? 'bg-primary/5 border-primary text-primary'
                                      : 'bg-background border-border/80 text-muted-foreground'
                                    }`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${currentQuestion.correctAnswerIndex === i
                                        ? 'border-primary bg-primary'
                                        : 'border-border'
                                      }`}
                                  >
                                    {currentQuestion.correctAnswerIndex === i && (
                                      <div className="w-2 h-2 bg-white rounded-full" />
                                    )}
                                  </div>
                                  {opt}
                                </button>
                              ))
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-3 border-t border-border/30">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Sélectionnez la réponse correcte
                            </p>

                            <div className="flex gap-2">
                              {editingQuestionIndex !== null && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingQuestionIndex(null);
                                    setCurrentQuestion({
                                      text: '',
                                      type: 'mcq',
                                      options: ['', '', '', ''],
                                      optionIds: [null, null, null, null],
                                      correctAnswer: '',
                                      correctAnswerIndex: -1,
                                      points: 10,
                                    });
                                  }}
                                  className="text-muted-foreground hover:text-foreground font-bold text-xs px-4 py-2 rounded-xl bg-secondary/50 transition-all"
                                >
                                  Annuler
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={addQuestion}
                                className="text-primary hover:text-primary/80 font-bold text-xs flex items-center gap-1.5 transition-all bg-primary/5 px-4 py-2 rounded-xl"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                {editingQuestionIndex !== null ? 'Mettre à jour la question' : 'Ajouter la question'}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                            Questions ajoutées ({formData.questions.length})
                          </h4>

                          <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {formData.questions.map((q, i) => (
                              <div
                                key={q.id}
                                className="p-4 bg-card border border-border/40 rounded-2xl flex justify-between items-center group hover:shadow-md transition-all"
                              >
                                <div>
                                  <p className="font-bold text-sm leading-tight">
                                    {i + 1}. {q.text}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-[9px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                      {q.type === 'mcq' ? 'QCM' : 'Vrai / Faux'}
                                    </span>
                                    <p className="text-[10px] text-emerald-600 font-bold">
                                      ✓ {q.correctAnswer}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    type="button"
                                    onClick={() => handleEditQuestionUI(i)}
                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                    title="Modifier"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        questions: formData.questions.filter((_, idx) => idx !== i),
                                      });
                                      if (editingQuestionIndex === i) {
                                        setEditingQuestionIndex(null);
                                        setCurrentQuestion({
                                          text: '',
                                          type: 'mcq',
                                          options: ['', '', '', ''],
                                          optionIds: [null, null, null, null],
                                          correctAnswer: '',
                                          correctAnswerIndex: -1,
                                          points: 10,
                                        });
                                      } else if (editingQuestionIndex !== null && editingQuestionIndex > i) {
                                        setEditingQuestionIndex(editingQuestionIndex - 1);
                                      }
                                    }}
                                    className="p-2 text-error hover:bg-error/10 rounded-lg transition-all"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          Sujet de l'épreuve
                        </label>

                        <textarea
                          placeholder="Décrivez précisément ce que le candidat doit réaliser..."
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full h-64 p-6 bg-background border border-border/80 rounded-[2rem] outline-none focus:border-primary transition-all font-medium text-lg resize-none"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-border/30">
                      <button
                        onClick={() => setModalStep('info')}
                        className="w-12 h-12 flex items-center justify-center bg-secondary rounded-full"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      <button
                        onClick={() =>
                          isStepValid()
                            ? setModalStep('summary')
                            : toast.error(
                              selectedType === 'quiz'
                                ? 'Veuillez ajouter au moins une question'
                                : "Veuillez saisir le sujet de l'épreuve"
                            )
                        }
                        className={`w-12 h-12 flex items-center justify-center rounded-full shadow-lg transition-all ${isStepValid()
                            ? 'bg-primary text-white shadow-primary/20'
                            : 'bg-secondary text-muted-foreground cursor-not-allowed'
                          }`}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                )}

                {modalStep === 'summary' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="bg-secondary/10 p-6 rounded-[2rem] border border-border/30">
                          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">
                            Récapitulatif
                          </h4>

                          <h3 className="text-xl font-bold mb-2">{formData.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                            {formData.description}
                          </p>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/50 p-4 rounded-2xl border border-border/30">
                              <p className="text-[10px] font-bold text-muted-foreground">Durée</p>
                              <p className="text-lg font-bold">{formData.duration} min</p>
                            </div>

                            <div className="bg-white/50 p-4 rounded-2xl border border-border/30">
                              <p className="text-[10px] font-bold text-muted-foreground">Type</p>
                              <p className="text-lg font-bold capitalize">{selectedType}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                            {selectedType === 'quiz'
                              ? `Questions (${formData.questions.length})`
                              : "Sujet de l'épreuve"}
                          </h4>

                          <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                            {selectedType === 'quiz' ? (
                              formData.questions.map((q, i) => (
                                <div key={q.id} className="p-4 bg-card border border-border/30 rounded-2xl">
                                  <p className="text-sm font-bold">
                                    {i + 1}. {q.text}
                                  </p>
                                  <p className="text-xs text-emerald-600 font-bold mt-1">
                                    Réponse: {q.correctAnswer}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 bg-card border border-border/30 rounded-2xl italic text-sm">
                                {formData.subject}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          Affecter immédiatement
                        </h4>

                        <div className="grid grid-cols-1 gap-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                          {candidates.map(candidate => (
                            <button
                              type="button"
                              key={candidate.id}
                              onClick={() => toggleCandidate(candidate.id)}
                              className={`p-4 rounded-2xl border transition-all flex items-center justify-between text-left ${formData.assignedCandidates.includes(candidate.id)
                                  ? 'bg-primary/5 border-primary shadow-sm'
                                  : 'bg-card border-border/50 hover:border-primary/30'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#F87171] text-white flex items-center justify-center font-bold">
                                  {candidate.name.charAt(0)}
                                </div>

                                <div>
                                  <p className="font-bold text-sm leading-none">{candidate.name}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{candidate.email}</p>
                                </div>
                              </div>

                              <div
                                className={`w-8 h-4 rounded-full transition-all relative ${formData.assignedCandidates.includes(candidate.id) ? 'bg-primary' : 'bg-secondary'
                                  }`}
                              >
                                <div
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${formData.assignedCandidates.includes(candidate.id) ? 'left-4' : 'left-0.5'
                                    }`}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-border/30">
                      <button
                        onClick={() => setModalStep('content')}
                        className="w-12 h-12 flex items-center justify-center bg-secondary rounded-full"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      <button
                        onClick={handleCreateTest}
                        className="px-6 h-11 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all text-sm"
                      >
                        {editingId ? 'Mettre à jour' : 'Valider & Publier'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(selectedSessionResult || isLoadingSessionResult) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedSessionResult(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {isLoadingSessionResult ? (
                <div className="p-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="text-muted-foreground animate-pulse font-medium">Chargement des réponses du candidat...</p>
                </div>
              ) : (
                <>
                  <div className="p-8 border-b border-border/40 bg-secondary/5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                         <div className="px-2 py-0.5 rounded-lg text-[9px] font-bold text-white bg-emerald-500 uppercase tracking-wider">
                           Test Terminé
                         </div>
                         <div className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                           <Award className="w-3 h-3" />
                           Score Final: <span className="text-primary">{selectedSessionResult.score} / 100</span>
                         </div>
                      </div>
                      <h2 className="text-2xl font-black tracking-tight">{selectedSessionResult.examTitle}</h2>
                    </div>
                    <button
                      onClick={() => setSelectedSessionResult(null)}
                      className="p-2 bg-secondary rounded-xl hover:bg-error hover:text-white transition-all shadow-sm"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    {selectedSessionResult.sections?.map((section: any, sIdx: number) => (
                      <div key={sIdx} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-border/40" />
                          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                            {section.nomSection}
                          </h3>
                          <div className="h-px flex-1 bg-border/40" />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {section.questions?.map((q: any, qIdx: number) => (
                            <div key={qIdx} className="p-5 bg-secondary/15 rounded-[1.5rem] border border-border/40 hover:border-primary/20 transition-all">
                              <div className="flex justify-between items-start gap-4 mb-4">
                                <p className="font-bold text-base leading-tight">
                                  {qIdx + 1}. {q.textQuestion}
                                </p>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black shrink-0 ${q.questionScore > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-error/10 text-error'}`}>
                                  {q.questionScore} pts
                                </div>
                              </div>

                              {q.typeQuestion === 'mcq' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {q.options?.map((opt: any, oIdx: number) => (
                                    <div 
                                      key={oIdx}
                                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                        opt.isSelected 
                                          ? opt.isCorrect ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-error/5 border-error/30'
                                          : opt.isCorrect ? 'bg-emerald-500/5 border-emerald-200/50' : 'bg-background border-border/40'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                          opt.isSelected ? opt.isCorrect ? 'bg-emerald-500 border-emerald-500' : 'bg-error border-error' : 'border-border'
                                        }`}>
                                          {opt.isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <span className={`text-sm font-medium ${opt.isSelected ? 'font-bold' : ''}`}>
                                          {opt.textOption}
                                        </span>
                                      </div>
                                      
                                      {opt.isCorrect && (
                                        <div className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-1">
                                          <CheckCircle className="w-3 h-3" />
                                          Bonne réponse
                                        </div>
                                      )}
                                      {opt.isSelected && !opt.isCorrect && (
                                        <div className="text-[8px] font-black text-error uppercase flex items-center gap-1">
                                          <X className="w-3 h-3" />
                                          Choix candidat
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 bg-background border border-border/40 rounded-xl">
                                  <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-widest">Réponse du candidat:</p>
                                  <p className="text-sm italic font-medium">"{q.userAnswer || 'Pas de réponse'}"</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 border-t border-border/40 bg-secondary/5 flex justify-end">
                    <button
                      onClick={() => setSelectedSessionResult(null)}
                      className="px-8 h-12 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                    >
                      Fermer l'aperçu
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
