import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { api } from '../../helpers/apiClient'
import { ArrowLeft, Video, Shield, User as UserIcon, AlertCircle, Star, MessageSquare, CheckCircle, ChevronRight, ChevronLeft, Save, FileText, Download, Clock, Play, Pause } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { CVViewer } from '../../components/CVViewer'

export function VideoInterview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const auth = useSelector((s: any) => s.auth)
  const [interview, setInterview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Evaluation State
  const [isEvalOpen, setIsEvalOpen] = useState(false)
  const [evaluationNotes, setEvaluationNotes] = useState('')
  const [rating, setRating] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [showCVViewer, setShowCVViewer] = useState(false)
  const [liveQuestions, setLiveQuestions] = useState<{ id: string; text: string; score?: number }[]>([])
  const [newQuestionText, setNewQuestionText] = useState('')

  // Timer State
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const addLiveQuestion = () => {
    if (newQuestionText.trim()) {
      setLiveQuestions(prev => [...prev, { id: Date.now().toString(), text: newQuestionText.trim() }])
      setNewQuestionText('')
    } else {
      toast.error('Veuillez saisir une question.')
    }
  }
  
  // Robust role extraction handling strings and nested objects
  const rawRole = auth?.user?.role ?? auth?.user?.Role;
  const roleDescription = (typeof rawRole === 'object' ? (rawRole?.description ?? rawRole?.Description ?? '') : (rawRole ?? '')).toString().toLowerCase().trim();
  
  const isCandidate = roleDescription.includes('candidat') || roleDescription.includes('candidate');
  
  // A host is anyone who is NOT a candidate AND (has a staff role OR is assigned to this interview)
  const isHost = !isCandidate && roleDescription !== '' && (
    roleDescription === 'admin' || 
    roleDescription === 'rh' || 
    roleDescription === 'hr' ||
    roleDescription.includes('team') || 
    roleDescription.includes('leader') ||
    roleDescription.includes('recrut') ||
    (interview && (
      interview.UserId === auth?.user?.Id || 
      interview.userId === auth?.user?.Id || 
      interview.UserId === auth?.user?.id || 
      interview.userId === auth?.user?.id
    ))
  )
  
  useEffect(() => {
    console.log('[VideoInterview] Raw Role:', rawRole);
    console.log('[VideoInterview] Normalized Role:', roleDescription);
    console.log('[VideoInterview] Is Candidate:', isCandidate);
    api.get(`/api/RecruitementProcess/${id}`)
      .then(data => {
        console.log('[VideoInterview] Loaded interview:', data);
        setInterview(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching interview:', err);
        setError('Impossible de charger les détails de l\'entretien')
        setLoading(false)
      })
  }, [id])
  
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-red-600"/>
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="w-6 h-6 text-red-600 animate-pulse" />
        </div>
      </div>
      <p className="text-slate-500 font-medium animate-pulse">Connexion à la salle sécurisée...</p>
    </div>
  )

  if (error || !interview) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center max-w-md text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Oups !</h2>
        <p className="text-slate-500 mb-8">{error || 'Entretien non trouvé'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Retourner au tableau de bord
        </button>
      </div>
    </div>
  )
  
  // Use host URL for recruiters, regular URL for candidates
  const hLink = interview?.hostMeetLink || interview?.HostMeetLink;
  const gLink = interview?.meetLink || interview?.MeetLink;
  
  console.log('[VideoInterview] Role:', roleDescription, 'isHost:', isHost, 'HostLink:', hLink ? 'Yes' : 'No');

  const meetingUrl = isHost ? (hLink || gLink) : gLink;
  
  if (!meetingUrl) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center max-w-md text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
          <Video className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Lien non disponible</h2>
        <p className="text-slate-500 mb-8">Le lien de réunion n'a pas encore été généré ou est expiré.</p>
        <button 
          onClick={() => navigate(-1)}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>
      </div>
    </div>
  )
  
  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      {/* Premium Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shadow-sm z-10"
      >
        <div className="flex items-center gap-6">
          <button 
            onClick={() => {
              if (confirm('Voulez-vous vraiment quitter l\'entretien ?')) {
                navigate(-1)
              }
            }}
            className="p-2 hover:bg-slate-50 rounded-xl transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900" />
          </button>
          
          <div className="h-8 w-px bg-slate-100" />

          {isHost && (
            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-mono font-bold text-slate-700 tracking-tighter">
                {formatTime(elapsedTime)}
              </span>
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className="p-1 hover:bg-white rounded-md transition-all shadow-sm"
              >
                {isPaused ? <Play className="w-3 h-3 text-emerald-600 fill-current" /> : <Pause className="w-3 h-3 text-amber-600 fill-current" />}
              </button>
            </div>
          )}
          
          <div className="h-8 w-px bg-slate-100" />
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute inset-0 opacity-75"/>
              <div className="w-3 h-3 rounded-full bg-red-500 relative"/>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 flex items-center gap-2">
                Entretien en direct
                <span className="text-slate-300 font-normal">|</span>
                <span className="text-slate-500 font-medium text-sm">
                  {interview?.Application?.NameApplication || interview?.candidateName || 'Session'}
                </span>
              </h1>
            </div>
          </div>


        <div className="flex items-center gap-3">
          {isHost && (
            <button
              onClick={() => setIsEvalOpen(!isEvalOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                isEvalOpen 
                  ? 'bg-slate-900 text-white border-slate-800' 
                  : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isEvalOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              <span className="text-xs font-bold uppercase tracking-wider">
                {isEvalOpen ? 'Masquer Évaluation' : 'Évaluer le candidat'}
              </span>
            </button>
          )}

          {isHost ? (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-xl border border-red-100">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Session Hôte</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100">
              <UserIcon className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Salle d'attente</span>
            </div>
          )}
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Iframe Container */}
        <div className={`relative bg-slate-950 transition-all duration-500 ease-in-out ${isEvalOpen ? 'w-2/3' : 'w-full'}`}>
          {meetingUrl.includes('google.com/meet') ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-lg border border-slate-200">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <Video className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Lien Google Meet détecté</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  Google Meet n'autorise pas l'affichage direct dans notre plateforme pour des raisons de sécurité. 
                  Veuillez cliquer sur le bouton ci-dessous pour rejoindre l'entretien dans un nouvel onglet.
                </p>
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 hover:-translate-y-1"
                >
                  Ouvrir Google Meet
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src={meetingUrl}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              className="absolute inset-0 w-full h-full border-0"
              title="Video Interview"
            />
          )}
        </div>

        {/* Evaluation Sidebar */}
        <AnimatePresence>
          {isEvalOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-1/3 bg-white border-l border-slate-200 flex flex-col shadow-2xl z-20"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Évaluation en direct
                </h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                  Notes et Score Recruteur
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Candidate Summary Card */}
                <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Candidat</p>
                      <h3 className="font-bold text-lg">
                        {interview?.Application?.User?.Nom} {interview?.Application?.User?.Prenom} 
                        {(!interview?.Application?.User?.Nom && !interview?.Application?.User?.Prenom) && (interview?.Application?.NameApplication || interview?.candidateName || 'Candidat')}
                      </h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Poste</span>
                      <span className="font-bold">{interview?.Application?.JobPosting?.PositionTitle || interview?.position}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Type</span>
                      <span className="font-bold uppercase">{interview?.type || 'RH'}</span>
                    </div>
                    
                    <button
                      onClick={() => setShowCVViewer(true)}
                      className="w-full mt-2 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Consulter le CV Réel
                    </button>
                  </div>
                </div>

                {/* Rating Section (Emojis) */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Note globale de l'entretien
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-4 font-medium italic">Quelle est votre impression générale sur le candidat ?</p>
                  <div className="flex items-center justify-between gap-2">
                    {[
                      { icon: '😰', label: 'MÉDIOCRE', val: 1 },
                      { icon: '😐', label: 'MOYEN', val: 2 },
                      { icon: '😊', label: 'BIEN', val: 3 },
                      { icon: '😄', label: 'TRÈS BIEN', val: 4 },
                      { icon: '🤩', label: 'EXCELLENT', val: 5 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => setRating(item.val)}
                        className={`flex-1 aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 ${
                          rating === item.val 
                            ? 'bg-red-50 border-red-500 text-red-600 shadow-md scale-105' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-3xl">{item.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
                        {rating === item.val && <span className="text-[10px] font-black">{item.val * 20}%</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Questions Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Questions posées
                  </h3>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addLiveQuestion()}
                      placeholder="Ajouter une question..."
                      className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                    <button
                      onClick={addLiveQuestion}
                      className="px-4 bg-primary text-white rounded-xl font-bold text-xs"
                    >
                      Ajouter
                    </button>
                  </div>

                  <div className="space-y-3">
                    {liveQuestions.map((q, idx) => (
                      <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs font-bold text-primary mb-1">Question {idx + 1}</p>
                        <p className="text-sm font-medium text-slate-900">{q.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Commentaires & Notes
                  </h3>
                  <textarea
                    value={evaluationNotes}
                    onChange={(e) => setEvaluationNotes(e.target.value)}
                    placeholder="Saisissez vos observations ici..."
                    className="w-full h-48 p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm leading-relaxed"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white">
                <button
                  disabled={isSaving || rating === 0}
                  onClick={async () => {
                    if (rating === 0) {
                      toast.error('Veuillez d\'abord choisir une note (cliquez sur un émoji) avant de valider.')
                      return
                    }
                    setIsSaving(true)
                    try {
                      const payload = {
                        ...interview,
                        EvaNote: rating * 20, // Échelle 1-5 -> 20-100, cohérent avec le reste de l'app
                        EvaCommentaire: evaluationNotes,
                        IdStatus: 4, // Mark as completed
                        Duration: Math.ceil(elapsedTime / 60) // Save duration in minutes
                      }
                      await api.put('/api/RecruitementProcess', payload)
                      toast.success('Évaluation enregistrée avec succès')
                      navigate(-1)
                    } catch (err) {
                      toast.error('Erreur lors de l\'enregistrement')
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  Terminer et Enregistrer
                </button>
                {rating === 0 && (
                  <p className="text-[11px] text-slate-400 mt-2 text-center font-medium">
                    Choisissez d'abord une note ci-dessus.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="bg-white/80 backdrop-blur-md px-8 py-2 flex justify-center border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          Sécurisé par Whereby Embedded & TriCareer
        </p>
      </div>

      {showCVViewer && interview?.Application && (
        <CVViewer
          candidateName={`${interview?.Application?.User?.Nom || ''} ${interview?.Application?.User?.Prenom || ''}`.trim() || interview?.Application?.NameApplication || 'Candidat'}
          candidateEmail={interview?.Application?.User?.Email || interview?.Application?.email || ''}
          position={interview?.Application?.JobPosting?.PositionTitle || ''}
          experience={interview?.Application?.User?.Experience || ''}
          skills={interview?.Application?.User?.Skills || ''}
          summary={interview?.Application?.User?.Bio || ''}
          matchingScore={interview?.Application?.Score || 0}
          cvPath={interview?.Application?.cvPath}
          onClose={() => setShowCVViewer(false)}
        />
      )}
    </div>
  )
}
