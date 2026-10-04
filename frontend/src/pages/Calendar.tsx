import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, Video, X, ChevronRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useInterviews } from '../hooks/useInterviews';
import { useSessions } from '../hooks/useSessions';

interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  position: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  interviewer: string;
  location?: string;
  eventType?: 'interview' | 'test';
}

const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();
const daysInMonth = Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }, (_, i) => i + 1);
// Décalage Lundi-first : nb de cellules vides avant le jour 1 (getDay: 0=Dim..6=Sam)
const firstDayOffset = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
const calendarCells: (number | null)[] = [...Array(firstDayOffset).fill(null), ...daysInMonth];
const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function Calendar() {
  const navigate = useNavigate();
  const { data: interviewsRaw, loading: interviewsRawLoading } = useInterviews();
  const { data: sessionsRaw, loading: sessionsLoading } = useSessions();

  const [filterType, setFilterType] = useState<'all' | 'interview' | 'test'>('all');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const interviews = (Array.isArray(interviewsRaw) ? interviewsRaw : []).map((it: any, idx: number) => {
    const get = (obj: any, key: string) => obj?.[key] ?? obj?.[key.charAt(0).toLowerCase() + key.slice(1)];
    const app = get(it, 'Application');
    const user = get(it, 'User');
    const job = get(app, 'JobPosting');
    const posNav = get(it, 'IdPositionNavigation');
    const statusNav = get(it, 'IdStatusNavigation');

    return {
      id: String(get(it, 'RecruitementProcessId') ?? get(it, 'Id') ?? idx),
      candidateName: get(app, 'NameApplication') || get(user, 'Username') || get(user, 'Name') || get(it, 'CandidateName') || 'Candidat',
      candidateEmail: get(app, 'Email') || get(user, 'Email') || 'Email non renseigné',
      resumePath: get(app, 'CvPath') || null,
      position: get(posNav, 'PositionName') || get(job, 'PositionTitle') || get(it, 'Position') || 'Entretien',
      scheduledDate: (get(it, 'DatePlanification') || get(it, 'Date') || new Date().toISOString()).split('T')[0],
      scheduledTime: get(it, 'Time') || '10:00',
      duration: Number(get(it, 'Duration') || 60),
      status: (get(statusNav, 'StatusDescription') || 'scheduled').toString().toLowerCase(),
      interviewer: get(user, 'Username') || get(user, 'Name') || get(it, 'Interviewer') || 'TBD',
      location: get(it, 'Location') || 'Visio',
      meetingLink: get(it, 'MeetLink') || get(it, 'MeetingLink'),
      eventType: (() => {
        const stepName = (get(posNav, 'PositionName') || get(posNav, 'NamePipline') || get(it, 'Position') || '').toLowerCase();
        return (stepName.includes('test') || stepName.includes('quiz') || stepName.includes('examen') || stepName.includes('technique')) ? 'test' : 'interview';
      })() as 'interview' | 'test',
    };
  });

  const tests = (Array.isArray(sessionsRaw) ? sessionsRaw : []).map((s: any, idx: number) => {
    const get = (obj: any, key: string) => obj?.[key] ?? obj?.[key.charAt(0).toLowerCase() + key.slice(1)];
    const app = get(s, 'Application');
    const user = get(app, 'User');
    const test = get(s, 'Test');

    return {
      id: String(get(s, 'SessionId') ?? get(s, 'Id') ?? idx),
      candidateName: get(app, 'NameApplication') || get(user, 'Username') || get(user, 'Name') || get(s, 'CandidateName') || 'Candidat',
      candidateEmail: get(app, 'Email') || get(user, 'Email') || 'Email non renseigné',
      resumePath: get(app, 'CvPath') || null,
      position: get(test, 'Title') || get(s, 'TestTitle') || 'Test Technique',
      scheduledDate: (get(s, 'Deadline') || get(s, 'deadline') || get(s, 'Date') || get(s, 'date') || get(s, 'CreatedAt') || get(s, 'createdAt') || new Date().toISOString()).split('T')[0],
      scheduledTime: get(s, 'Time') || get(s, 'time') || '09:00',
      duration: Number(get(s, 'Duration') || 60),
      status: (get(s, 'Status') || 'scheduled').toString().toLowerCase(),
      interviewer: 'Système',
      location: 'En ligne',
      eventType: 'test' as const,
    };
  });

  const events = [...interviews, ...tests].filter(e => {
    if (filterType === 'all') return true;
    return e.eventType === filterType;
  });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInterview, setNewInterview] = useState<Partial<Interview>>({
    scheduledDate: selectedDate,
    scheduledTime: '10:00',
    duration: 60,
    status: 'scheduled',
  });

  const getEventsForDate = (date: string) => {
    return events.filter(e => e.scheduledDate === date);
  };

  const handleAddInterview = () => {
    if (!newInterview.candidateName || !newInterview.position || !newInterview.interviewer) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (newInterview.scheduledDate! < todayStr) {
      toast.error('Vous ne pouvez pas planifier un entretien dans le passé');
      return;
    }

    toast.success('Entretien planifié avec succès (Simulation)');
    setShowAddModal(false);
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  if (interviewsRawLoading || sessionsLoading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-8 border-primary/10 border-t-primary rounded-full animate-spin" />
        <p className="text-2xl font-black text-muted-foreground uppercase tracking-[0.3em] animate-pulse">Initialisation...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Calendrier</h1>
          <p className="text-muted-foreground font-medium">Gérez vos entretiens et tests techniques</p>
        </div>
        
        <div className="flex items-center gap-3">
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
            onClick={() => setShowAddModal(true)}
            className="h-11 px-6 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Planifier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-bold text-xl tracking-tight">{monthNames[currentMonth]} {currentYear}</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-5 py-2 bg-secondary rounded-xl text-xs font-bold hover:bg-secondary/80 transition-all active:scale-95"
              >
                Aujourd'hui
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {calendarCells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;
              const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = getEventsForDate(date);
              const isSelected = date === selectedDate;
              const isToday = date === new Date().toISOString().split('T')[0];

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={`aspect-square p-3 rounded-2xl border transition-all relative group flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105 z-10'
                      : dayEvents.length > 0
                      ? 'border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40'
                      : 'border-border/30 hover:bg-secondary/50'
                  }`}
                >
                  <span className={`text-sm font-bold ${isToday && !isSelected ? 'text-primary' : ''}`}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-1">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${e.eventType === 'interview' ? 'bg-primary' : 'bg-info'}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </h3>

            {selectedDateEvents.length > 0 ? (
              <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {selectedDateEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 rounded-[1.5rem] border cursor-pointer transition-all active:scale-98 shadow-sm ${
                      event.eventType === 'interview' 
                      ? 'bg-primary/5 border-primary/10 hover:border-primary/20' 
                      : 'bg-info/5 border-info/10 hover:border-info/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                        event.eventType === 'interview' ? 'bg-primary text-white' : 'bg-info text-white'
                      }`}>
                        {event.eventType === 'interview' ? 'Entretien' : 'Test Tech'}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-md">{event.scheduledTime}</span>
                    </div>
                    <p className="font-bold text-sm tracking-tight mb-0.5">{event.candidateName}</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{event.position}</p>
                    
                    <div className="mt-3 pt-3 border-t border-border/20 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        <span>{event.interviewer}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-20 h-20 bg-secondary/30 rounded-[1.5rem] flex items-center justify-center mb-4">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <h4 className="text-xs font-bold text-foreground/70 mb-1">Date vide</h4>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Aucun événement</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setSelectedEvent(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card border border-border/40 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-start mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                  selectedEvent.eventType === 'interview' ? 'bg-primary' : 'bg-info'
                }`}>
                  {selectedEvent.eventType === 'interview' ? <Video className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-3 bg-secondary rounded-2xl hover:bg-secondary/80 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Candidat</h4>
                  <p className="text-2xl font-bold tracking-tight">{selectedEvent.candidateName}</p>
                  <p className="text-xs font-bold text-primary mt-1">{selectedEvent.candidateEmail}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Poste</h4>
                    <p className="text-sm font-bold">{selectedEvent.position}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Type</h4>
                    <p className="text-sm font-bold capitalize">{selectedEvent.eventType === 'interview' ? 'Entretien' : 'Test Technique'}</p>
                  </div>
                </div>

                <div className="p-6 bg-secondary/15 rounded-3xl space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Heure & Durée</p>
                      <p className="text-sm font-bold">{selectedEvent.scheduledTime} ({selectedEvent.duration} min)</p>
                    </div>
                  </div>

                  {selectedEvent.resumePath && (
                    <a 
                      href={selectedEvent.resumePath} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-2 hover:bg-white rounded-2xl transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Curriculum Vitae</p>
                        <p className="text-sm font-bold text-primary">Voir le CV</p>
                      </div>
                    </a>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Interviewer</p>
                      <p className="text-sm font-bold">{selectedEvent.interviewer}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedEvent.eventType === 'interview' && (selectedEvent.meetingLink || selectedEvent.location?.includes('http')) && (
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={() => navigate(`/interview/${selectedEvent.id}`)}
                    className="flex-1 h-14 bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                  >
                    <Video className="w-5 h-5" />
                    Rejoindre l'entretien
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card border border-border/40 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <h2 className="text-2xl font-bold mb-8 tracking-tight text-center">Planifier un entretien</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Nom du candidat *</label>
                  <input
                    type="text"
                    value={newInterview.candidateName || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, candidateName: e.target.value })}
                    placeholder="Jean Dupont"
                    className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Poste *</label>
                  <input
                    type="text"
                    value={newInterview.position || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, position: e.target.value })}
                    placeholder="Développeur Full Stack"
                    className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Date *</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={newInterview.scheduledDate || ''}
                      onChange={(e) => setNewInterview({ ...newInterview, scheduledDate: e.target.value })}
                      className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Heure *</label>
                    <input
                      type="time"
                      value={newInterview.scheduledTime || ''}
                      onChange={(e) => setNewInterview({ ...newInterview, scheduledTime: e.target.value })}
                      className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Interviewer *</label>
                  <input
                    type="text"
                    value={newInterview.interviewer || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, interviewer: e.target.value })}
                    placeholder="Marie Dubois"
                    className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Lieu</label>
                  <input
                    type="text"
                    value={newInterview.location || ''}
                    onChange={(e) => setNewInterview({ ...newInterview, location: e.target.value })}
                    placeholder="Salle A ou Visioconférence"
                    className="w-full h-12 px-6 bg-secondary/15 border border-border/40 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-14 bg-secondary text-foreground rounded-2xl font-bold text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddInterview}
                  className="flex-1 h-14 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
