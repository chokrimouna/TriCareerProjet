import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Video, PlayCircle, ChevronLeft, ChevronRight, AlertCircle, Info, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { api } from '../helpers/apiClient';

interface CalendarEvent {
  id: string;
  type: 'test' | 'interview';
  title: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  interviewer?: string;
  description: string;
}

export function CandidateCalendar() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number | null>(new Date().getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const userEmail = (user?.Email ?? (user as any)?.email ?? '').toLowerCase();
        const userId = String(user?.Id ?? (user as any)?.id ?? (user as any)?.userId ?? '');

        if (!userEmail && !userId) {
           setLoading(false);
           return;
        }
        const allApps = await api.get<any[]>('/api/Application/getAllApps').catch(() => []);
        const myApps = allApps.filter(a => {
          const appEmail = (a.Email ?? a.email ?? '').toLowerCase().trim();
          const aUserId = String(a.UserId ?? a.userId ?? '');
          return (userEmail && appEmail === userEmail) || (userId && aUserId === userId);
        });
        const myAppIds = myApps.map(a => a.ApplicationId ?? a.applicationId).filter(id => id);

        let allEvents: CalendarEvent[] = [];

        // 1. Fetch Interviews (RecruitementProcess)
        const allProcesses = await api.get<any[]>('/api/RecruitementProcess').catch(() => []);
        const myInterviews = allProcesses.filter(p => myAppIds.includes(p.ApplicationId ?? p.applicationId));
        
        myInterviews.forEach(p => {
          const dateStr = p.DatePlanification ?? p.datePlanification;
          if (dateStr && typeof dateStr === 'string') {
            const parts = dateStr.split('T');
              const stepName = (p.IdPositionNavigation?.NamePipline ?? p.IdPositionNavigation?.NamePosition ?? p.idPositionNavigation?.namePipline ?? p.idPositionNavigation?.namePosition ?? '').toLowerCase();
              const isTest = stepName.includes('test') || stepName.includes('quiz') || stepName.includes('examen') || stepName.includes('technique');

              allEvents.push({
                id: `int-${p.RecruitementProcessId ?? p.recruitementProcessId}`,
                type: isTest ? 'test' : 'interview',
                title: p.IdPositionNavigation?.NamePipline ?? p.idPositionNavigation?.namePipline ?? (isTest ? 'Test Technique' : 'Entretien'),
                date: parts[0],
                time: parts[1]?.substring(0, 5) ?? '00:00',
                duration: 60,
                location: p.EvaCommentaire?.includes('[MODE]:') ? p.EvaCommentaire.split('[MODE]:')[1].split('\n')[0].trim() : 'En ligne',
                interviewer: p.User?.Name ? `${p.User.Name} ${p.User.Prename || ''}` : (p.user?.name ? `${p.user.name} ${p.user.prename || ''}` : 'Recruteur TriCareer'),
                description: p.EvaCommentaire?.includes('[NOTES]:') ? p.EvaCommentaire.split('[NOTES]:')[1].trim() : (isTest ? 'Test technique assigné' : 'Entretien de recrutement')
              });
          }
        });

        // 2. Fetch Tests (Sessions)
        for (const appId of myAppIds) {
          const sessions = await api.get<any[]>(`/api/Sessions/GetSessionAllByIdApp/${appId}`).catch(() => []);
          sessions.forEach(item => {
            const s = item?.session ?? item?.Session ?? item;
            const dateStr = s.deadline ?? s.Deadline ?? s.dateDebut ?? s.DateDebut ?? s.createdAt ?? s.CreatedAt;
            if (dateStr && typeof dateStr === 'string') {
              const parts = dateStr.split('T');
              allEvents.push({
                id: `test-${s.SessionId ?? s.sessionId}`,
                type: 'test',
                title: s.Examen?.Titre ?? s.examen?.titre ?? s.Examn?.Titre ?? s.examn?.titre ?? 'Test Technique',
                date: parts[0],
                time: parts[1]?.substring(0, 5) ?? '00:00',
                duration: s.Examen?.Duration ?? s.examen?.duration ?? s.Examn?.Duration ?? s.examn?.duration ?? 60,
                description: s.Examen?.Description ?? s.examen?.description ?? s.Examn?.Description ?? s.examn?.description ?? 'Test technique assigné'
              });
            }
          });
        }

        setEvents(allEvents);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchEvents();
  }, [user]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'test') {
      navigate('/my-tests');
    } else {
      navigate('/my-interviews');
    }
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon Calendrier</h1>
        <p className="text-muted-foreground font-medium">Suivez la planification de vos tests et entretiens.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={handlePreviousMonth}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-secondary hover:bg-secondary/80 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-secondary hover:bg-secondary/80 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4 mb-6">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground/60 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-4">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const dayEvents = getEventsForDate(day);
              const isToday = day === new Date().getDate() &&
                             currentDate.getMonth() === new Date().getMonth() &&
                             currentDate.getFullYear() === new Date().getFullYear();
              const isSelected = selectedDate === day;

              return (
                <motion.div
                  key={day}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square p-3 rounded-3xl border-2 transition-all relative cursor-pointer flex flex-col ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : isToday
                      ? 'border-primary/30 bg-primary/5'
                      : dayEvents.length > 0
                      ? 'border-primary/20 bg-primary/5 hover:border-primary/40'
                      : 'border-transparent bg-secondary/30 hover:bg-secondary/50'
                  }`}
                >
                  <span className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>
                    {day}
                  </span>
                  <div className="mt-auto flex flex-wrap gap-1">
                    {dayEvents.map((e, idx) => (
                      <div 
                        key={idx}
                        className={`w-2 h-2 rounded-full ${e.type === 'test' ? 'bg-amber-500' : 'bg-primary'}`} 
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-xl">
            <h3 className="text-xl font-bold mb-6">
              {selectedDate
                ? `Détails du ${selectedDate} ${monthNames[currentDate.getMonth()]}`
                : 'Prochainement'}
            </h3>
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm font-medium">Chargement...</p>
                </div>
              ) : (selectedDate ? selectedDayEvents : upcomingEvents).length > 0 ? (
                (selectedDate ? selectedDayEvents : upcomingEvents).map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleEventClick(event)}
                    className="p-5 rounded-3xl border border-border/50 bg-secondary/10 hover:bg-secondary/20 cursor-pointer transition-all hover:border-primary/30 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                        event.type === 'test' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                      }`}>
                        {event.type === 'test' ? <PlayCircle className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base mb-2 group-hover:text-primary transition-colors">{event.title}</h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{event.time} ({event.duration} min)</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-[2rem]">
                  <Info className="w-10 h-10 mx-auto mb-4 opacity-10" />
                  <p className="text-xs font-bold uppercase tracking-widest opacity-40">Aucun événement</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#DC2626] to-[#F87171] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative">
              <h3 className="text-lg font-black uppercase tracking-widest mb-6">Aujourd'hui</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold opacity-80">Tests Planifiés</span>
                  <span className="text-2xl font-black">{getEventsForDate(new Date().getDate()).filter(e => e.type === 'test').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold opacity-80">Entretiens</span>
                  <span className="text-2xl font-black">{getEventsForDate(new Date().getDate()).filter(e => e.type === 'interview').length}</span>
                </div>
                <div className="pt-6 mt-6 border-t border-white/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
                    <span className="font-bold">Actif</span>
                  </div>
                  <Zap className="w-8 h-8 fill-white/20 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
