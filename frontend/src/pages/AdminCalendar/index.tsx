import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, User, CheckCircle2, AlertCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../helpers/apiClient';
import { toast } from 'sonner';

type CalendarEvent = {
  id: string;
  date: string;
  type: 'Entretien' | 'Test';
  candidateName: string;
  time: string;
  interviewer: string;
  status: string;
};

const getMonthDays = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  // Padding for start of month
  const firstDayOfWeek = (first.getDay() + 6) % 7; // Adjust to start on Monday
  for (let i = 0; i < firstDayOfWeek; i++) {
    const d = new Date(year, month, -i);
    days.unshift(d);
  }
  
  for (let d = 1; d <= last.getDate(); d += 1) {
    days.push(new Date(year, month, d));
  }
  
  // Padding for end of month
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - (last.getDate() + firstDayOfWeek) + 1);
    days.push(d);
  }
  
  return { first, days };
};

export default function AdminCalendar() {
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceShow, setForceShow] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [piplines, setPiplines] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    applicationId: '',
    idPosition: '',
    idStatus: '',
    datePlanification: '',
    deadline: '',
    userId: '',
  });

  const reloadEvents = async () => {
    try {
      const [res, piplinesRes, sessionsRes] = await Promise.all([
        api.get<any[]>('/api/RecruitementProcess'),
        api.get<any[]>('/api/Piplines').catch(() => api.get<any[]>('/api/Pipline').catch(() => [])),
        api.get<any[]>('/api/Sessions').catch(() => [])
      ]);

      const piplinesList = Array.isArray(piplinesRes) ? piplinesRes : [];
      const sessionsList = Array.isArray(sessionsRes) ? sessionsRes : [];

      // From API: id:1=Technique, id:2=RH
      // All pipline positions are interviews EXCEPT ones explicitly named "test"
      // Since Sessions table is empty, all RecruitementProcess entries are
      // interviews OR test assignments tracked in RecruitementProcess.
      // Use the piplines data to classify correctly.

      const testPositionIds = new Set(
        piplinesList
          .filter((p: any) => {
            const name = String(
              p?.NamePipline ?? p?.namePipline ?? p?.Name ?? p?.name ?? ''
            ).toLowerCase();
            return name.includes('test') || name.includes('quiz') ||
                   name.includes('examen') || name.includes('technical');
          })
          .map((p: any) => Number(p?.Id ?? p?.id ?? p?.IdPosition ?? 0))
      );

      // DO NOT hardcode testPositionIds.add(3)
      // Instead, if piplinesList is empty, classify by checking
      // if the position name contains "technique" AND has sessions attached:
      const classifyType = (r: any): 'Entretien' | 'Test' => {
        const posId = Number(r?.IdPosition ?? r?.idPosition ?? 0);
        if (testPositionIds.has(posId)) return 'Test';

        // If piplines not loaded, check sessions array
        const hasSessions = Array.isArray(r?.sessions) && r.sessions.length > 0;
        if (hasSessions) return 'Test';

        // Check position name directly
        const posName = String(
          r?.IdPositionNavigation?.NamePipline ??
          r?.idPositionNavigation?.namePipline ?? ''
        ).toLowerCase();
        if (posName.includes('test') || posName.includes('quiz') ||
            posName.includes('examen')) return 'Test';

        return 'Entretien';
      };

      const mapped = (Array.isArray(res) ? res : []).map((r: any, idx: number) => ({
        id: String(r?.RecruitementProcessId ?? r?.recruitementProcessId ?? idx),
        date: String(r?.DatePlanification ?? r?.datePlanification ?? ''),
        type: classifyType(r),
        candidateName: String(
          r?.Application?.NameApplication ??
          r?.application?.nameApplication ??
          r?.Application?.nameApplication ??
          r?.application?.NameApplication ??
          r?.Application?.Email ??
          r?.application?.email ??
          'Candidat'
        ),
        time: (() => {
          const raw = r?.DatePlanification ?? r?.datePlanification;
          if (!raw) return '--:--';
          
          const s = String(raw);
          const timeMatch = s.match(/T(\d{2}:\d{2})/) || s.match(/(\d{2}:\d{2})/);
          if (timeMatch) return timeMatch[1];

          const d = new Date(raw);
          if (isNaN(d.getTime())) return '--:--';
          return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          });
        })(),
        interviewer: String(
          r?.User?.Name ?? r?.user?.name ??
          r?.User?.Prename ?? r?.user?.prename ??
          r?.User?.Username ?? r?.user?.username ??
          r?.User?.Email ?? r?.user?.email ??
          'Non assigné'
        ),
        status: String(
          r?.IdStatusNavigation?.NameStatus ??
          r?.idStatusNavigation?.nameStatus ??
          r?.IdStatusNavigation?.nameStatus ??
          r?.idStatusNavigation?.NameStatus ??
          'N/A'
        ),
      })) as CalendarEvent[];

      const sessionEvents: CalendarEvent[] = sessionsList.map((s: any) => ({
        id: `sess-${s.sessionId || s.SessionId}`,
        date: s.deadline || s.Deadline || s.createdAt || s.CreatedAt || '',
        type: 'Test' as const,
        candidateName: (s.application || s.Application)?.nameApplication || (s.application || s.Application)?.NameApplication || 'Candidat',
        time: '09:00',
        interviewer: 'Système',
        status: (s.score || s.Score) ? 'Terminé' : 'En attente',
      }));

      setEvents([...mapped, ...sessionEvents]);
      setLoading(false);
    } catch (e: any) {
      console.error('reload events failed:', e);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setForceShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [appsRes, piplinesRes, statusRes] = await Promise.all([
          api.get<any[]>('/api/Application/getAllApps'),
          api.get<any[]>('/api/Piplines').catch(() => api.get<any[]>('/api/Pipline').catch(() => [])),
          api.get<any[]>('/api/Status').catch(() => []),
        ]);
        setApplications(Array.isArray(appsRes) ? appsRes : []);
        setPiplines(Array.isArray(piplinesRes) ? piplinesRes : []);
        setStatuses(Array.isArray(statusRes) ? statusRes : []);
        await reloadEvents();
      } catch (e: any) {
        setError(e?.message || 'Erreur chargement calendrier');
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const [examens, setExamens] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/Examans').then((res: any) => {
      setExamens(Array.isArray(res) ? res : []);
    }).catch(err => console.error('Failed to load exams:', err));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.applicationId || !addForm.idPosition || !addForm.datePlanification) {
      toast.error('Candidat, type et date sont requis');
      return;
    }
    setSubmitting(true);
    try {
      const [newDate, newTime] = addForm.datePlanification.split('T');
      await api.post('/api/RecruitementProcess', {
        recruitementProcess: {
          ApplicationId: Number(addForm.applicationId),
          IdPosition: Number(addForm.idPosition),
          IdStatus: Number(addForm.idStatus) || 1,
          DatePlanification: addForm.datePlanification,
          Deadline: `${newDate}T${newTime}:00`,
          UserId: Number(addForm.userId) || null,
        },
        idExamen: null,
      });
      toast.success('Planifié avec succès');
      setShowAddModal(false);
      setAddForm({
        applicationId: '', idPosition: '', idStatus: '',
        datePlanification: '', deadline: '', userId: '',
      });
      await reloadEvents();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEvent) return;
    setSubmitting(true);
    try {
      await api.put('/api/RecruitementProcess', {
        RecruitementProcessId: Number(editEvent.id),
        DatePlanification: addForm.datePlanification || editEvent.date,
        Deadline: addForm.deadline || null,
        IdPosition: Number(addForm.idPosition) || undefined,
        IdStatus: Number(addForm.idStatus) || undefined,
      });
      toast.success('Modifié avec succès');
      setShowEditModal(false);
      setEditEvent(null);
      await reloadEvents();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur modification');
    } finally {
      setSubmitting(false);
    }
  };

  const { days } = useMemo(() => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = e.date ? new Date(e.date).toISOString().slice(0, 10) : '';
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  if (loading && !forceShow) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground mt-1 text-sm">Visualisez et gérez les rendez-vous de recrutement</p>
        </div>
        <div className="flex items-center gap-4 bg-card border border-border p-2 rounded-2xl">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} 
            className="h-10 w-10 hover:bg-secondary rounded-xl flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold min-w-[150px] text-center">
            {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} 
            className="h-10 w-10 hover:bg-secondary rounded-xl flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-10 px-5 bg-[#DC2626] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Planifier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift">
          <p className="text-muted-foreground text-xs font-bold  tracking-wider mb-1">Total ce mois</p>
          <p className="text-3xl font-bold">{events.filter(e => new Date(e.date).getMonth() === currentDate.getMonth()).length}</p>
        </div>
        <div className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift">
          <p className="text-muted-foreground text-xs font-bold  tracking-wider mb-1">Entretiens</p>
          <p className="text-3xl font-bold text-primary">{events.filter(e => e.type === 'Entretien').length}</p>
        </div>
        <div className="bg-card border border-border rounded-[2rem] p-6 shadow-card hover-lift">
          <p className="text-muted-foreground text-xs font-bold  tracking-wider mb-1">Tests</p>
          <p className="text-3xl font-bold text-success">{events.filter(e => e.type === 'Test').length}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-border bg-secondary/20">
          {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((d) => (
            <div key={d} className="px-4 py-3 text-center text-[10px] font-black  tracking-widest text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-border">
          {days.map((day, idx) => {
            const key = day.toISOString().slice(0, 10);
            const dayEvents = groupedByDate.get(key) ?? [];
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div 
                key={key} 
                className={`min-h-32 border-r border-b border-border p-2 transition-colors ${isCurrentMonth ? 'bg-card' : 'bg-secondary/10 opacity-50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : ''}`}>
                    {day.getDate()}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEvent(e)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold truncate transition-transform hover:scale-[1.02] border ${
                        e.type === 'Entretien' 
                          ? 'bg-primary/5 text-primary border-primary/10' 
                          : 'bg-success/5 text-success border-success/10'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <div className={`w-1 h-1 rounded-full ${e.type === 'Entretien' ? 'bg-primary' : 'bg-success'}`} />
                        {e.time} - {e.candidateName}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedEvent.type === 'Entretien' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Détails de l'événement</h2>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-2xl border border-border">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {selectedEvent.candidateName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold  tracking-wider">Candidat</p>
                    <p className="text-lg font-bold">{selectedEvent.candidateName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black  tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Heure
                    </p>
                    <p className="text-sm font-bold">{selectedEvent.time}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black  tracking-widest flex items-center gap-1">
                      <User className="w-3 h-3" /> Responsable
                    </p>
                    <p className="text-sm font-bold">{selectedEvent.interviewer}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground  tracking-widest">Statut actuel</span>
                    <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold border border-border">
                      {selectedEvent.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-secondary/30 flex gap-3">
                <button
                  onClick={() => {
                    setEditEvent(selectedEvent);
                    setAddForm({
                      applicationId: '',
                      idPosition: '',
                      idStatus: '',
                      datePlanification: selectedEvent.date,
                      deadline: '',
                      userId: '',
                    });
                    setSelectedEvent(null);
                    setShowEditModal(true);
                  }}
                  className="flex-1 h-12 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Supprimer cet événement ?')) return;
                    try {
                      await api.delete(`/api/RecruitementProcess/${selectedEvent.id}`);
                      toast.success('Événement supprimé');
                      setSelectedEvent(null);
                      await reloadEvents();
                    } catch (e: any) {
                      toast.error(e?.message || 'Erreur suppression');
                    }
                  }}
                  className="h-12 w-12 bg-error/10 text-error hover:bg-error hover:text-white rounded-xl flex items-center justify-center transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1 h-12 bg-[#DC2626] text-white rounded-xl font-bold hover:opacity-90 transition-opacity text-sm"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold">Planifier un entretien / test</h2>
                <button onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Candidat <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    required
                    value={addForm.applicationId}
                    onChange={e => setAddForm({ ...addForm, applicationId: e.target.value })}
                    className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626] text-sm"
                  >
                    <option value="">Sélectionner un candidat</option>
                    {applications.map((app: any) => (
                      <option
                        key={app.ApplicationId ?? app.applicationId}
                        value={app.ApplicationId ?? app.applicationId}
                      >
                        {app.NameApplication ?? app.nameApplication ?? app.Email ?? app.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Type <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    required
                    value={addForm.idPosition}
                    onChange={e => setAddForm({ ...addForm, idPosition: e.target.value })}
                    className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626] text-sm"
                  >
                    <option value="">Sélectionner un type</option>
                    {piplines.length > 0
                      ? piplines.map((p: any) => {
                          const pid = p?.Id ?? p?.id ?? p?.IdPosition ?? p?.idPosition;
                          const pname = p?.NamePipline ?? p?.namePipline ?? p?.Name ?? p?.name ?? '';
                          return (
                            <option key={pid} value={pid}>
                              {pname}
                            </option>
                          );
                        })
                      : (
                        <>
                          <option value="1">Entretien Technique</option>
                          <option value="2">Entretien RH</option>
                        </>
                      )
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Date et heure <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={addForm.datePlanification}
                    onChange={e => setAddForm({ ...addForm, datePlanification: e.target.value })}
                    className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Date limite</label>
                  <input
                    type="date"
                    value={addForm.deadline}
                    onChange={e => setAddForm({ ...addForm, deadline: e.target.value })}
                    className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626] text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 h-11 border border-border rounded-xl font-medium hover:bg-secondary transition-colors text-sm">
                    Annuler
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 h-11 bg-[#DC2626] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
                    {submitting ? 'Planification...' : 'Planifier'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold">Modifier l'entretien / test</h2>
                <button onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Type</label>
                  <select
                    value={addForm.idPosition}
                    onChange={e => setAddForm({ ...addForm, idPosition: e.target.value })}
                    className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626] text-sm"
                  >
                    <option value="">Sélectionner un type</option>
                    {piplines.map((p: any) => (
                      <option key={p.IdPosition ?? p.idPosition ?? p.Id}
                        value={p.IdPosition ?? p.idPosition ?? p.Id}>
                        {p.NamePipline ?? p.namePipline ?? p.Name ?? p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Date et heure</label>
                  <input
                    type="datetime-local"
                    value={addForm.datePlanification}
                    onChange={e => setAddForm({ ...addForm, datePlanification: e.target.value })}
                    className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Date limite</label>
                  <input
                    type="date"
                    value={addForm.deadline}
                    onChange={e => setAddForm({ ...addForm, deadline: e.target.value })}
                    className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-[#DC2626] text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowEditModal(false)}
                    className="flex-1 h-11 border border-border rounded-xl font-medium hover:bg-secondary transition-colors text-sm">
                    Annuler
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 h-11 bg-[#DC2626] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
                    {submitting ? 'Modification...' : 'Enregistrer'}
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
