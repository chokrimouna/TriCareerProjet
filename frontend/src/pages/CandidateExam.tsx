import { useState, useEffect, useRef } from 'react';
import { Play, Clock, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Upload, FileText, Send, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';
import { API_BASE_URL } from '../config';

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'text' | 'code';
  options?: string[];
  optionIds?: number[];
  points: number;
}

interface TestSession {
  id: string;
  title: string;
  description: string;
  examType: 'quiz' | 'code' | 'design' | 'redaction';
  duration: number; // in seconds
  questions: Question[];
  status: 'loading' | 'not_started' | 'in_progress' | 'completed' | 'error';
  timeRemaining: number;
  answers: Record<string, string>;
  file?: File;
  realSessionId?: number;
}

export function CandidateExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<TestSession>({
    id: id || '',
    title: 'Chargement...',
    description: '',
    examType: 'quiz',
    duration: 3600,
    questions: [],
    status: 'loading',
    timeRemaining: 3600,
    answers: {},
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Résultat du quiz (score + bonnes/mauvaises réponses) affiché à l'étudiant à la fin
  const [examResult, setExamResult] = useState<any | null>(null);

  // US17 - Anti-triche : compteur de changements d'onglet / pertes de focus
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const tabSwitchCountRef = useRef(0);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        if (!id) return;
        // Fetch session details using the details endpoint
        const details = await api.get<any>(`/api/Sessions/details/${id}`);
        
        if (details && details.lSection) {
          const allQuestions: Question[] = [];
          details.lSection.forEach((section: any) => {
            if (section.questions) {
              section.questions.forEach((q: any) => {
                allQuestions.push({
                  id: String(q.idQuestion),
                  text: q.nameQuestion || 'Question sans titre',
                  type: 'multiple_choice', 
                  options: q.answers ? q.answers.map((a: any) => a.label || a.name || a.valueAnswer || a.nameAnswer || 'Option') : [],
                  optionIds: q.answers ? q.answers.map((a: any) => a.id) : [],
                  points: parseInt(q.barem || '1'),
                });
              });
            }
          });

          // Use real duration from API if available, otherwise fallback
          const totalDurationSeconds = details.totalDuration || (allQuestions.length > 0 ? allQuestions.reduce((sum, q) => sum + 5, 0) * 60 : 3600);
          
          const title = details.examTitle || 'Évaluation Technique';
          
          // Synchronized type detection logic
          let type: 'quiz' | 'code' | 'design' | 'redaction' = 'redaction';
          const hasMCQAnswers = allQuestions.some(q => q.options && q.options.length > 0);
          const lowerTitle = title.toLowerCase();

          if (hasMCQAnswers) {
            type = 'quiz';
          } else if (lowerTitle.includes('code')) {
            type = 'code';
          } else if (lowerTitle.includes('design')) {
            type = 'design';
          } else if (lowerTitle.includes('redaction') || lowerTitle.includes('rédac')) {
            type = 'redaction';
          } else {
            type = 'redaction'; // Default fallback for manual tests
          }

          setSession(prev => ({
            ...prev,
            title: title,
            description: details.description || '',
            examType: type as any,
            questions: allQuestions,
            duration: totalDurationSeconds,
            timeRemaining: totalDurationSeconds,
            status: 'not_started',
            realSessionId: details.sessionId || details.SessionId
          }));
        } else {
          setSession(prev => ({ ...prev, status: 'error' }));
        }
      } catch (error) {
        console.error('Failed to load test:', error);
        setSession(prev => ({ ...prev, status: 'error' }));
      }
    };

    fetchTestData();
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (session.status === 'in_progress') {
      interval = setInterval(() => {
        setSession(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;

          if (newTimeRemaining <= 0) {
            handleComplete();
            return { ...prev, status: 'completed', timeRemaining: 0 };
          }

          return { ...prev, timeRemaining: newTimeRemaining };
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [session.status]);

  // US17 - Anti-triche : détecter les changements d'onglet / pertes de focus pendant le test
  useEffect(() => {
    if (session.status !== 'in_progress') return;

    let lastInfractionAt = 0;
    const registerInfraction = () => {
      const now = Date.now();
      // évite le double comptage (blur + visibilitychange déclenchés ensemble)
      if (now - lastInfractionAt < 800) return;
      lastInfractionAt = now;
      tabSwitchCountRef.current += 1;
      setTabSwitchCount(tabSwitchCountRef.current);
      toast.warning(
        `⚠️ Quitter l'onglet pendant le test est interdit. Avertissement n°${tabSwitchCountRef.current} (enregistré).`
      );
    };

    const handleVisibility = () => {
      if (document.hidden) registerInfraction();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', registerInfraction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', registerInfraction);
    };
  }, [session.status]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStart = () => {
    setSession(prev => ({ ...prev, status: 'in_progress' }));
    toast.success('Examen démarré ! Votre temps est compté.');
  };

  const handleComplete = async () => {
    try {
      const realId = session.realSessionId;
      if (!realId) {
        toast.error('Session ID introuvable, impossible de soumettre.');
        return;
      }

      if (session.examType === 'quiz') {
        // Submit MCQ answers
        const promises = session.questions.map((q) => {
          const questionId = q.id;
          const selectedAnswerId = session.answers[questionId];
          const optionIndex = q.optionIds?.indexOf(Number(selectedAnswerId));
          const answerLabel = optionIndex !== undefined && optionIndex >= 0 ? q.options?.[optionIndex] : '';

          return api.post('/api/ResponseValue', {
            responseValuedata: {
              idQuestion: parseInt(questionId),
              idSession: realId,
              answered: !!selectedAnswerId,
              timeReponse: 0
            },
            responseDetaildata: [{
              value: answerLabel || '',
              idAnswers: selectedAnswerId ? Number(selectedAnswerId) : null
            }]
          });
        });
        await Promise.all(promises);
      } else {
        // Handle manual test submission (Design/Code/Redaction)
        if (session.file) {
          const formData = new FormData();
          formData.append('file', session.file);
          formData.append('sessionId', String(realId));
          
          const token = localStorage.getItem('tricareer_token') || sessionStorage.getItem('tricareer_token') || '';
          const uploadRes = await fetch(`${API_BASE_URL}/api/Sessions/upload`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
          });

          if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error(errText || `Erreur serveur (${uploadRes.status})`);
          }
        } else if (session.examType === 'redaction' || session.examType === 'code') {
          // If no file but it's text-based, allow submitting the "answers" as text if we had a textarea
          // For now, we'll just allow marking as complete since the recruiter might have asked for something else
          console.log('Submitting manual test without file');
        }
      }

      // Mark session as complete (US17: on transmet le nombre d'infractions anti-triche)
      await api.patch(`/api/Sessions/${realId}/complete?tabSwitchCount=${tabSwitchCountRef.current}`);

      // Récupère le résultat (score + bonnes/mauvaises réponses) pour l'afficher à l'étudiant
      if (session.examType === 'quiz') {
        try {
          const result = await api.get<any>(`/api/Sessions/result/${realId}`);
          setExamResult(result);
        } catch {
          // pas bloquant : on affiche quand même l'écran de fin
        }
      }

      setSession(prev => ({ ...prev, status: 'completed' }));
      toast.success('Examen terminé et soumis avec succès !');
    } catch (e: any) {
      console.error('Submission error:', e);
      toast.error('Erreur lors de la soumission. Veuillez réessayer.');
    }
  };

  const handleAnswerChange = (questionId: string, answerId: string | number) => {
    setSession(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answerId },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSession(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  if (session.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-muted-foreground mb-6">Impossible de charger les détails du test. Veuillez contacter le support.</p>
          <button onClick={() => navigate('/my-tests')} className="w-full h-12 bg-[#DC2626] text-white rounded-xl font-semibold">
            Retour à mes tests
          </button>
        </div>
      </div>
    );
  }

  if (session.status === 'not_started') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-card border border-border rounded-[2.5rem] p-10 text-center shadow-2xl"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Clock className="w-12 h-12 text-[#DC2626]" />
          </div>
          <h1 className="text-4xl font-black mb-6 tracking-tighter">{session.title}</h1>
          
          <div className={`grid ${session.examType === 'quiz' ? 'grid-cols-3' : 'grid-cols-1'} gap-6 mb-10`}>
            <div className="bg-secondary/50 rounded-2xl p-4">
              <Clock className="w-5 h-5 mx-auto mb-2 text-[#DC2626]" />
              <p className="text-xs text-muted-foreground uppercase font-black">Durée</p>
              <p className="font-bold">{Math.round(session.duration / 60)} min</p>
            </div>
            {session.examType === 'quiz' && (
              <>
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <AlertCircle className="w-5 h-5 mx-auto mb-2 text-[#DC2626]" />
                  <p className="text-xs text-muted-foreground uppercase font-black">Questions</p>
                  <p className="font-bold">{session.questions.length}</p>
                </div>
              </>
            )}
          </div>

          <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl p-6 mb-10 text-left">
            <h3 className="font-bold text-[#DC2626] mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Règles de l'examen
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                Le chronomètre démarre dès que vous cliquez sur "Commencer"
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                Vous ne pouvez pas mettre le test en pause
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                Le test sera automatiquement soumis à la fin du temps imparti
              </li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            className="h-16 px-12 bg-[#DC2626] text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 mx-auto shadow-xl text-lg"
          >
            <Play className="w-6 h-6" />
            Commencer l'examen
          </button>
        </motion.div>
      </div>
    );
  }

  if (session.status === 'completed') {
    const hasQuizResult = examResult && Array.isArray(examResult.sections);
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl w-full bg-card border border-border rounded-[2.5rem] p-10 shadow-2xl"
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-black mb-2 tracking-tighter">Quiz terminé !</h1>
            {hasQuizResult ? (
              <>
                <p className="text-muted-foreground mb-3">Votre score</p>
                <div className="text-6xl font-black text-[#DC2626] mb-8">{examResult.score} <span className="text-2xl text-muted-foreground">/ 100</span></div>
              </>
            ) : (
              <p className="text-muted-foreground mb-8 text-lg">
                Vos réponses ont été soumises avec succès. Nos équipes vont maintenant évaluer votre performance.
              </p>
            )}
          </div>

          {hasQuizResult && (
            <div className="space-y-4 text-left max-h-[50vh] overflow-y-auto pr-2 mb-8">
              {examResult.sections.map((section: any, sIdx: number) =>
                (section.questions || []).map((q: any, qIdx: number) => (
                  <div key={`${sIdx}-${qIdx}`} className="p-4 bg-secondary/15 rounded-2xl border border-border/40">
                    <p className="font-bold mb-3">{qIdx + 1}. {q.textQuestion}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.options || []).map((opt: any, oIdx: number) => (
                        <div
                          key={oIdx}
                          className={`px-3 py-2 rounded-lg text-sm border flex items-center justify-between gap-2 ${
                            opt.isSelected
                              ? opt.isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 font-semibold'
                                : 'bg-error/10 border-error/40 text-error font-semibold'
                              : opt.isCorrect
                                ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-600'
                                : 'bg-background border-border/40'
                          }`}
                        >
                          <span>{opt.textOption}</span>
                          {opt.isCorrect && (
                            <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1 shrink-0">
                              <CheckCircle className="w-3 h-3" /> Bonne réponse
                            </span>
                          )}
                          {opt.isSelected && !opt.isCorrect && (
                            <span className="text-[9px] font-black text-error uppercase flex items-center gap-1 shrink-0">
                              <X className="w-3 h-3" /> Votre choix
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => navigate('/my-tests')}
              className="h-14 px-10 bg-[#DC2626] text-white rounded-2xl font-bold hover:shadow-xl transition-all"
            >
              Retour à mon portail
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const isQuiz = session.examType === 'quiz';
  const progress = isQuiz ? ((currentQuestionIndex + 1) / session.questions.length) * 100 : 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <h2 className="font-black text-xl tracking-tighter">{session.title}</h2>
            </div>
            <div className="flex items-center gap-4">
              {tabSwitchCount > 0 && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-600 text-sm font-bold"
                  title="Sorties d'onglet détectées pendant le test (anti-triche) — enregistrées"
                >
                  <AlertCircle className="w-4 h-4" />
                  {tabSwitchCount} sortie{tabSwitchCount > 1 ? 's' : ''} d'onglet
                </div>
              )}
              <div className={`flex items-center gap-3 font-mono font-black text-2xl ${session.timeRemaining < 300 ? 'text-red-500' : 'text-[#DC2626]'}`}>
                <Clock className="w-6 h-6" />
                {formatTime(session.timeRemaining)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-[#DC2626]"
              />
            </div>
            {isQuiz && (
              <span className="text-sm font-black text-muted-foreground">
                {currentQuestionIndex + 1}/{session.questions.length}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-8 mt-12">
        <AnimatePresence mode="wait">
          {isQuiz ? (
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border rounded-[2.5rem] p-10 shadow-xl"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-black uppercase tracking-widest text-[#DC2626]">Question {currentQuestionIndex + 1}</span>
              </div>

              <h3 className="text-2xl font-bold mb-10 leading-tight">
                {currentQuestion?.text}
              </h3>

              <div className="space-y-4 mb-12">
                {currentQuestion?.options?.map((option, idx) => {
                  const optionId = currentQuestion.optionIds?.[idx] ?? idx;
                  const isSelected = String(session.answers[currentQuestion.id]) === String(optionId);
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerChange(currentQuestion.id, optionId)}
                      className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-[#DC2626] bg-[#DC2626]/5 shadow-inner'
                          : 'border-border hover:border-[#DC2626]/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-[#DC2626]' : 'border-border'
                      }`}>
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
                        )}
                      </div>
                      <span className="font-semibold">{option}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-8 border-t border-border">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 font-bold text-muted-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" /> Précédent
                </button>

                <div className="flex gap-2">
                  {session.questions.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentQuestionIndex ? 'w-6 bg-[#DC2626]' : session.answers[session.questions[i].id] !== undefined ? 'bg-[#DC2626]/40' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>

                {currentQuestionIndex === session.questions.length - 1 ? (
                  <button
                    onClick={handleComplete}
                    className="px-10 h-12 bg-[#DC2626] text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
                  >
                    Soumettre
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="flex items-center gap-2 font-bold text-[#DC2626]"
                  >
                    Suivant <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-[2.5rem] p-10 shadow-xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <FileText className="w-6 h-6 text-[#DC2626]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Sujet de l'épreuve</h3>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{session.examType}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-sm max-w-none mb-10 bg-secondary/20 p-8 rounded-3xl border border-border/40 italic text-lg leading-relaxed text-foreground/80">
                {session.description || "Aucune consigne spécifique n'a été fournie. Veuillez réaliser le travail demandé par le recruteur."}
              </div>

              {session.questions.length > 0 && (
                <div className="mb-10 space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#DC2626] mb-4">Consignes détaillées :</h4>
                  <div className="space-y-4">
                    {session.questions.map((q, idx) => (
                      <div key={q.id} className="bg-secondary/10 p-5 rounded-2xl border border-border/30">
                        <p className="font-bold text-foreground/90 flex gap-3">
                          <span className="text-[#DC2626]">{idx + 1}.</span>
                          {q.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <label className="block text-sm font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">
                  {session.examType === 'design' ? 'Déposez votre création (PSD, AI, FIGMA)' : 'Déposez votre fichier de réponse'}
                </label>
                
                <div className="relative group">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="test-file-upload"
                    accept=".zip,.pdf,.rar,.7z,.doc,.docx,.txt,.psd,.ai,.figma"
                  />
                  <label
                    htmlFor="test-file-upload"
                    className={`block p-12 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${session.file ? 'bg-emerald-50 border-emerald-200' : 'bg-secondary/10 border-border group-hover:border-primary/40 group-hover:bg-primary/5'}`}
                  >
                    {session.file ? (
                      <>
                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                        <div className="text-center">
                          <p className="font-bold text-emerald-700">{session.file.name}</p>
                          <p className="text-xs text-emerald-600">{(session.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        <p className="font-bold text-muted-foreground group-hover:text-primary transition-colors">Cliquez ou glissez votre fichier ici</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex justify-end mt-12 pt-8 border-t border-border">
                <button
                  onClick={handleComplete}
                  disabled={!session.file && session.examType !== 'redaction' && session.examType !== 'code'}
                  className="h-14 px-12 bg-[#DC2626] text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
                >
                  <Send className="w-5 h-5" />
                  {session.file ? 'Soumettre mon travail' : 'Soumettre (sans fichier)'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
