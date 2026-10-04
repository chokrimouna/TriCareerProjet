import { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  User,
  Building,
  FileText, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { toast } from 'sonner';
import { useInterviews } from '../hooks/useInterviews';
import { useApplications } from '../hooks/useApplications';
import { usePipeline } from '../hooks/usePipeline';
import { useSessions } from '../hooks/useSessions';
import { api } from '../helpers/apiClient';

export function TeamLeaderCalendar() {
  const user = useSelector((s: RootState) => s.auth.user);

  const { data: allInterviews, loading: interviewsLoading, refetch: refetchInterviews } = useInterviews();
  const { data: applications, loading: appsLoading } = useApplications();
  const { data: pipelineSteps } = usePipeline();
  const { data: sessionsRaw, refetch: refetchSessions } = useSessions();

  // Merge sessions as calendar events
  const allSessions = (Array.isArray(sessionsRaw) ? sessionsRaw : []).map((s: any) => ({
    ...s,
    _isSession: true,
    datePlanification: s.deadline || s.Deadline || s.dateDebut || s.DateDebut || s.date || s.Date || s.createdAt || s.CreatedAt,
  }));

  // Formate une date en 'YYYY-MM-DD' en heure LOCALE.
  // ⚠️ NE PAS utiliser toISOString() : il convertit en UTC et, en fuseau UTC+1 (WAT),
  // recule chaque date d'un jour → décalait tout le calendrier d'une colonne.
  const toLocalISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState(toLocalISO(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [showModal, setShowModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    applicationId: '',
    stepId: '',
    date: toLocalISO(new Date()),
    time: '10:00',
    location: 'en_ligne' as 'en_ligne' | 'sur_site',
    interviewerId: '',
  });

  const [filterType, setFilterType] = useState<'all' | 'interview' | 'test'>('all');

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Normalize firstDay (0 is Sunday, we want 0 for Monday or just use browser locale)
    const padding = (firstDay + 6) % 7; 
    
    const days = [];
    for (let i = 0; i < padding; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(toLocalISO(new Date(year, month, i)));
    }
    return days;
  }, [currentMonth]);

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const getInterviewsForDate = (date: string) => {
    const interviews = filterType !== 'test'
      ? (allInterviews || []).filter((i: any) => {
          const iDate = (i.datePlanification || i.DatePlanification)?.split('T')[0];
          return iDate === date;
        })
      : [];
    const sessions = filterType !== 'interview'
      ? allSessions.filter((s: any) => {
          const sDate = s.datePlanification?.split('T')[0];
          return sDate === date;
        })
      : [];
    
    // Mark interviews that are actually tests
    const processedInterviews = interviews.map((i: any) => {
      const stepName = (i.idPositionNavigation?.namePosition || i.idPositionNavigation?.namePipline || i.IdPositionNavigation?.NamePosition || i.IdPositionNavigation?.NamePipline || '').toLowerCase();
      const isTest = stepName.includes('test') || stepName.includes('quiz') || stepName.includes('examen') || stepName.includes('technique');
      return { ...i, _isTestStep: isTest };
    });

    return [...processedInterviews, ...sessions];
  };

  const selectedDateInterviews = useMemo(
    () => getInterviewsForDate(selectedDate),
    [selectedDate, allInterviews, allSessions, filterType]
  );

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const handleOpenModal = (interview: any = null) => {
    if (interview) {
        setEditingInterview(interview);
        const datePlan = interview.datePlanification || interview.DatePlanification;
        setFormData({
            applicationId: String(interview.applicationId || interview.ApplicationId || ''),
            stepId: String(interview.idPosition || interview.IdPosition || ''),
            date: datePlan ? datePlan.split('T')[0] : selectedDate,
            time: datePlan ? datePlan.split('T')[1].substring(0, 5) : '10:00',
            location: 'en_ligne',
            interviewerId: String(interview.userId || interview.UserId || ''),
        });
    } else {
        setEditingInterview(null);
        setFormData({
            applicationId: '',
            stepId: '',
            date: selectedDate,
            time: '10:00',
            location: 'en_ligne',
            interviewerId: '',
        });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const storedUser = JSON.parse(localStorage.getItem('tricareer_user') || '{}');
        const datePlanification = `${formData.date}T${formData.time}:00`;

        if (editingInterview) {
            // Use the correct ID regardless of API casing
            const processId = editingInterview.recruitementProcessId
                ?? editingInterview.RecruitementProcessId
                ?? editingInterview.id
                ?? editingInterview.Id;

            await api.put('/api/RecruitementProcess', {
                recruitementProcessId: processId,
                applicationId: editingInterview.applicationId || editingInterview.ApplicationId,
                idPosition: parseInt(formData.stepId) || editingInterview.idPosition || editingInterview.IdPosition,
                idStatus: editingInterview.idStatus || editingInterview.IdStatus || 2,
                datePlanification,
                userId: editingInterview.userId || editingInterview.UserId,
                final: editingInterview.final ?? editingInterview.Final ?? false,
            });
            toast.success('Entretien mis à jour');
        } else {
            const payload = {
                recruitementProcess: {
                    applicationId: parseInt(formData.applicationId),
                    idPosition: parseInt(formData.stepId),
                    idStatus: 2,
                    datePlanification,
                    userId: storedUser.Id || storedUser.id || storedUser.userId,
                },
                idExamen: 0
            };
            await api.post('/api/RecruitementProcess', payload);
            toast.success('Entretien planifié');
        }
        
        setShowModal(false);
        refetchInterviews();
    } catch (err) {
        toast.error('Erreur lors de l\'enregistrement');
        console.error(err);
    }
  };

  const handleDelete = async (interview: any) => {
    const id = interview?.recruitementProcessId
        ?? interview?.RecruitementProcessId
        ?? interview?.id
        ?? interview?.Id;
    if (!id) { toast.error('ID introuvable'); return; }
    if (confirm('Voulez-vous vraiment supprimer cet entretien ?')) {
        try {
            await api.delete(`/api/RecruitementProcess/${id}`);
            toast.success('Entretien supprimé');
            refetchInterviews();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    }
  };

  const handleDeleteSession = async (session: any) => {
    const id = session?.sessionId
        ?? session?.SessionId
        ?? session?.id
        ?? session?.Id;
    if (!id) { toast.error('ID introuvable'); return; }
    if (confirm('Voulez-vous vraiment supprimer ce test ?')) {
        try {
            await api.delete(`/api/Sessions/${id}`);
            toast.success('Test supprimé');
            refetchSessions();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground/90 mb-2">Calendrier Recrutement</h1>
          <p className="text-muted-foreground font-medium">Gérez vos entretiens et le suivi des candidats en temps réel.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-secondary/50 p-1 rounded-xl border border-border/40">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'interview', label: 'Entretiens' },
              { id: 'test', label: 'Tests' },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  filterType === type.id ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="h-12 px-6 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Planifier un entretien
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Monthly Calendar */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight capitalize">
                  {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h2>
                <span className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold border border-green-300">✓ suppression OK v5</span>
              </div>
              <div className="flex bg-secondary/50 p-1.5 rounded-2xl border border-border/40">
                <button onClick={handlePrevMonth} className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-muted-foreground hover:text-primary">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-4 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">Aujourd'hui</button>
                <button onClick={handleNextMonth} className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-muted-foreground hover:text-primary">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-4 mb-6">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-4">
              {calendarDays.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} />;
                
                const dayNum = parseInt(date.split('-')[2]);
                const dayInterviews = getInterviewsForDate(date);
                const isSelected = date === selectedDate;
                const isToday = date === toLocalISO(new Date());

                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`group relative aspect-square rounded-[1.5rem] border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105 z-10'
                        : isToday
                        ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                        : dayInterviews.length > 0
                        ? 'border-border/60 bg-secondary/20 hover:border-primary/20 hover:bg-secondary/40'
                        : 'border-transparent bg-secondary/10 hover:bg-secondary/30'
                    }`}
                  >
                    <span className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-foreground/80'}`}>{dayNum}</span>
                    {dayInterviews.length > 0 && (
                      <div className="flex gap-1">
                        {dayInterviews.slice(0, 3).map((ev: any, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white/60' : (ev._isSession || ev._isTestStep) ? 'bg-blue-500/70' : 'bg-primary/60'
                            }`} />
                        ))}
                        {dayInterviews.length > 3 && <span className={`text-[8px] font-semibold ${isSelected ? 'text-white/60' : 'text-primary/60'}`}>+</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Date Interviews */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-semibold tracking-tight">Entretiens du jour</h3>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">
                        {new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {selectedDateInterviews.length}
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[600px]">
              {interviewsLoading ? (
                <div className="py-20 text-center animate-pulse">
                    <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground font-semibold">Chargement...</p>
                </div>
              ) : selectedDateInterviews.length > 0 ? (
                selectedDateInterviews.map((int: any, i: number) => {
                    const app = applications.find(a => (a.applicationId || a.ApplicationId) === (int.applicationId || int.ApplicationId));
                    const isSession = int._isSession;
                    const userName = isSession
                        ? (int.application?.nameApplication || int.Application?.NameApplication || 'Candidat')
                        : (app?.user?.name || app?.User?.Name || 'Candidat');
                    const userPrename = isSession ? '' : (app?.user?.prename || app?.User?.Prename || '');
                    const posName = isSession
                        ? (int.examen?.titre || int.Examen?.Titre || 'Test technique')
                        : (int.idPositionNavigation?.namePosition || int.IdPositionNavigation?.NamePosition || 'Entretien');
                    const time = (int.datePlanification || int.DatePlanification)?.split('T')[1]?.substring(0, 5) || '--:--';

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`group border rounded-3xl p-5 hover:border-primary/20 transition-all relative overflow-hidden ${
                                (isSession || int._isTestStep)
                                ? 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'
                                : 'bg-secondary/15 border-border/40 hover:bg-secondary/30'
                            }`}
                        >
                            {int._isSession ? (
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDeleteSession(int)} title="Supprimer ce test" className="p-2 bg-white/80 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="absolute top-0 right-0 p-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(int)} title="Modifier" className="p-2 bg-white/80 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(int)} title="Supprimer" className="p-2 bg-white/80 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-start gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-110 transition-transform text-xs ${
                                    (isSession || int._isTestStep) ? 'bg-blue-500' : 'bg-white border border-border/40 !text-primary'
                                }`}>
                                    {(isSession || int._isTestStep) ? 'TEST' : `${(userName || '?')[0]}${userPrename?.[0] ?? ''}`}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg tracking-tight group-hover:text-primary transition-colors">{userName} {userPrename}</h4>
                                    <p className="text-xs font-semibold text-muted-foreground">{app?.jobPosting?.title || 'Poste non spécifié'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-2 bg-white/50 rounded-xl border border-border/40">
                                    <Clock className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-semibold">{time}</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-white/50 rounded-xl border border-border/40">
                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-semibold truncate">En ligne</span>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                    (isSession || int._isTestStep) ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'
                                }`}>
                                    {posName}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-500">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Planifié</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-secondary/10 rounded-[2rem] flex items-center justify-center mb-6">
                        <AlertCircle className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <h4 className="font-semibold text-muted-foreground/80">Aucun entretien</h4>
                    <p className="text-[10px] font-medium text-muted-foreground max-w-[200px] mt-2">
                        Il n'y a pas d'entretiens prévus pour cette date.
                    </p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-border/50">
                <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-3xl p-6 text-white shadow-lg shadow-primary/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2">Total Mois</p>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold">{allInterviews?.length || 0}</span>
                        <span className="text-xs font-semibold opacity-80 mb-2">Entretiens</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card border border-border/50 rounded-[2.5rem] p-10 max-w-xl w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tighter">
                        {editingInterview ? 'Modifier' : 'Planifier'}
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground mt-1">Veuillez remplir les informations de l'entretien.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 bg-secondary/50 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Candidat</label>
                    <select
                      required
                      disabled={!!editingInterview}
                      value={formData.applicationId}
                      onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                      className="w-full h-14 px-5 bg-secondary/20 border border-border/40 rounded-2xl outline-none focus:border-primary transition-all font-semibold text-lg appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="">Choisir un candidat</option>
                      {(Array.isArray(applications) ? applications : []).map((app: any) => (
                        <option key={app.applicationId || app.ApplicationId} value={app.applicationId || app.ApplicationId}>
                          {app.user?.name || app.User?.Name || 'Candidat'} {app.user?.prename || app.User?.Prename || ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Étape du recrutement</label>
                    <select
                      required
                      value={formData.stepId}
                      onChange={(e) => setFormData({ ...formData, stepId: e.target.value })}
                      className="w-full h-14 px-5 bg-secondary/20 border border-border/40 rounded-2xl outline-none focus:border-primary transition-all font-semibold text-lg appearance-none cursor-pointer"
                    >
                      <option value="">Choisir l'étape</option>
                      {(Array.isArray(pipelineSteps) ? pipelineSteps : []).map((step: any) => (
                        <option key={step.id || step.Id} value={step.id || step.Id}>
                          {step.namePipline || step.NamePipline}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Date</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full h-14 pl-12 pr-5 bg-secondary/20 border border-border/40 rounded-2xl outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Heure</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                        <input
                          type="time"
                          required
                          value={formData.time}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className="w-full h-14 pl-12 pr-5 bg-secondary/20 border border-border/40 rounded-2xl outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 h-14 bg-secondary text-foreground rounded-2xl font-semibold hover:bg-secondary/80 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-14 bg-primary text-white rounded-2xl font-semibold shadow-xl shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
                  >
                    {editingInterview ? 'Mettre à jour' : 'Confirmer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
