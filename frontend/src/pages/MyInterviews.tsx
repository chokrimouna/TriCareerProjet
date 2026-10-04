import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Video, PlayCircle, CheckCircle, XCircle, AlertCircle, X, Link as LinkIcon, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { api } from '../helpers/apiClient';

interface InterviewItem {
  id: string;
  type: 'test' | 'interview';
  title: string;
  company: string;
  position: string;
  scheduledDate?: string;
  scheduledTime?: string;
  duration: number;
  status: 'scheduled' | 'to_schedule' | 'completed' | 'missed';
  location?: string;
  interviewer?: string;
  description: string;
  availableFrom?: string;
  availableTo?: string;
  meetingLink?: string;
  notes?: string;
  rating?: number;
  evaluation?: string;
}

export function MyInterviews() {
  const [selectedInterview, setSelectedInterview] = useState<InterviewItem | null>(null);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const userEmail = String(
          currentUser?.Email ?? (currentUser as any)?.email ?? ''
        ).toLowerCase();

        // Step 1: Find my applications
        const allApps = await api.get<any[]>(
          '/api/Application/getAllApps'
        ).catch(() => []);

        const myApps = (Array.isArray(allApps) ? allApps : [])
          .filter((a: any) => {
            const appEmail = String(
              a?.Email ?? a?.email ?? ''
            ).toLowerCase();
            return userEmail && appEmail === userEmail;
          });

        if (myApps.length === 0) {
          setInterviews([]);
          setLoading(false);
          return;
        }

        const myAppIds = myApps
          .map((a: any) =>
            Number(a?.ApplicationId ?? a?.applicationId ?? 0)
          )
          .filter(id => id > 0);

        // Step 2: Get ALL RecruitementProcess entries
        // These are INTERVIEWS (Technique=1, RH=2, Final=3)
        // NOT tests — tests are in Session table
        const allProcesses = await api.get<any[]>(
          '/api/RecruitementProcess'
        ).catch(() => []);

        // Step 3: Filter only MY interviews
        const myProcesses = (
          Array.isArray(allProcesses) ? allProcesses : []
        ).filter((p: any) => {
          const appId = Number(
            p?.ApplicationId ?? p?.applicationId ?? 0
          );
          return myAppIds.includes(appId);
        });

        // Step 4: Map to InterviewItem
        const mapped = myProcesses.map((p: any) => {
          const recId = p?.RecruitementProcessId ??
            p?.recruitementProcessId;
          const dateStr = p?.DatePlanification ??
            p?.datePlanification;
          const posNav = p?.IdPositionNavigation ??
            p?.idPositionNavigation;
          const app = p?.Application ?? p?.application;
          const statusId = p?.IdStatus ?? p?.idStatus;
          const comment = String(
            p?.EvaCommentaire ?? p?.evaCommentaire ?? ''
          );

          // Extract mode from comment
          const mode = comment.includes('[MODE]:')
            ? comment.split('[MODE]:')[1]
              .split('\n')[0]
              .split('[')[0]
              .trim()
            : 'En ligne';

          // Extract notes from comment
          const notes = comment.includes('[NOTES]:')
            ? comment.split('[NOTES]:')[1].trim()
            : '';

          // Status mapping
          // statusId 4 = completed/done, 3 = in progress
          const status: InterviewItem['status'] =
            statusId === 4
              ? 'completed'
              : statusId === 5
                ? 'missed'
                : 'scheduled';

          return {
            id: String(recId || ''),
            type: 'interview' as const,
            title: posNav?.NamePipline ??
              posNav?.namePipline ??
              'Entretien',
            company: 'TriCareer',
            position: app?.JobPosting?.PositionTitle ??
              app?.jobPosting?.positionTitle ??
              'Poste',
            scheduledDate: dateStr?.split('T')[0],
            scheduledTime: dateStr?.split('T')[1]
              ?.substring(0, 5),
            duration: comment.includes('[DURATION]:')
              ? Number(
                comment.split('[DURATION]:')[1]
                  .split('\n')[0]
                  .split('[')[0]
                  .trim()
              ) || 60
              : 60,
            status,
            location: mode,
            interviewer: p.User?.Name ? `${p.User.Name} ${p.User.Prename || ''}` : (p.user?.name ? `${p.user.name} ${p.user.prename || ''}` : 'Recruteur TriCareer'),
            description: notes ||
              `Entretien ${posNav?.NamePipline ??
              posNav?.namePipline ?? ''}`,
            notes,
            // EvaNote est stocké sur l'échelle 20-100 ; on revient à 1-5 pour l'affichage étoiles/émoji.
            rating: (p.EvaNote ?? p.evaNote) ? Math.round((p.EvaNote ?? p.evaNote) / 20) : undefined,
            evaluation: notes,
            meetingLink: p?.MeetLink ?? p?.meetLink
          } as InterviewItem;
        });

        setInterviews(mapped);
      } catch (e) {
        console.error('Error fetching interviews:', e);
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    (currentUser as any)?.Id,
    (currentUser as any)?.Email,
  ]);
  /* useEffect(() => {
     (async () => {
       setLoading(true);
       try {
         const res = await api.get<any[]>('/api/RecruitementProcess');
         const mapped = res.map((i: any) => {
           const recId = i.RecruitementProcessId ?? i.recruitementProcessId;
           const dateStr = i.DatePlanification ?? i.datePlanification;
           const posNav = i.IdPositionNavigation ?? i.idPositionNavigation;
           const app = i.Application ?? i.application;
           const user = i.User ?? i.user;
           const status = i.IdStatus ?? i.idStatus;
           const comment = i.EvaCommentaire ?? i.evaCommentaire ?? '';
 
           return {
             id: String(recId || ''),
             type: 'interview',
             title: posNav?.NamePipline ?? posNav?.namePipline ?? 'Entretien',
             company: 'TriCareer',
             position: app?.JobPosting?.PositionTitle ?? app?.jobPosting?.positionTitle ?? 'Poste',
             scheduledDate: dateStr?.split('T')[0],
             scheduledTime: dateStr?.split('T')[1]?.substring(0, 5),
             duration: 60,
             status: (status === 3) ? 'completed' : 
                     (status === 4) ? 'missed' : 'scheduled',
             location: comment.includes('[MODE]:') ? comment.split('[MODE]:')[1].split('\n')[0].trim() : 'En ligne',
             interviewer: user?.Name ? `${user.Name} ${user.Prename || ''}` : (user?.name ? `${user.name} ${user.prename || ''}` : 'Recruteur'),
             description: comment.includes('[NOTES]:') ? comment.split('[NOTES]:')[1].trim() : 'Entretien de recrutement',
             notes: comment.includes('[NOTES]:') ? comment.split('[NOTES]:')[1].trim() : '',
           };
         });
         setInterviews(mapped);
       } catch (e) {
         console.error('Error fetching interviews:', e);
       } finally {
         setLoading(false);
       }
     })();
   }, [currentUser?.ApplicationId]);*/

  const getStatusConfig = (status: InterviewItem['status']) => {
    const configs = {
      scheduled: {
        label: 'Planifié',
        color: 'primary',
        bgClass: 'bg-primary/10',
        textClass: 'text-primary',
        icon: Calendar,
      },
      to_schedule: {
        label: 'À planifier',
        color: 'primary',
        bgClass: 'bg-primary/10',
        textClass: 'text-primary',
        icon: AlertCircle,
      },
      completed: {
        label: 'Terminé',
        color: 'secondary',
        bgClass: 'bg-secondary',
        textClass: 'text-secondary-foreground',
        icon: CheckCircle,
      },
      missed: {
        label: 'Manqué',
        color: 'secondary',
        bgClass: 'bg-secondary',
        textClass: 'text-secondary-foreground',
        icon: XCircle,
      },
    };
    return configs[status];
  };

  const handleViewDetails = (interview: InterviewItem) => {
    setSelectedInterview(interview);
  };
  const getActionButton = (interview: InterviewItem) => {
    if (interview.status === 'completed') {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">Complété</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            if (interview.meetingLink) {
              navigate(`/interview/${interview.id}`);
            } else {
              alert("Le lien de réunion n'est pas encore prêt. Veuillez rafraîchir la page dans quelques instants ou consulter votre email.");
            }
          }}
          className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
            interview.meetingLink 
              ? 'bg-[#DC2626] text-white hover:shadow-xl hover:scale-105' 
              : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-70'
          }`}
        >
          <Video className="w-4 h-4" />
          Rejoindre
        </button>
        <button
          onClick={() => handleViewDetails(interview)}
          className={`px-6 py-3 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 ${
            interview.meetingLink 
              ? 'bg-secondary text-foreground hover:bg-secondary/80' 
              : 'bg-[#DC2626] text-white hover:shadow-xl hover:scale-105'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Voir les détails
        </button>
      </div>
    );
  };

  const scheduledInterviews = interviews.filter(i => i.status === 'scheduled' || i.status === 'to_schedule');
  const completedInterviews = interviews.filter(i => i.status === 'completed' || i.status === 'missed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Mes Entretiens</h1>
        <p className="text-muted-foreground font-medium">
          Suivez vos échanges avec les recruteurs et préparez vos prochaines étapes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Entretiens à venir', value: scheduledInterviews.length, icon: Calendar, color: 'primary' },
          { label: 'Entretiens complétés', value: completedInterviews.length, icon: CheckCircle, color: 'emerald' },
          { label: 'Total Dossiers', value: interviews.length, icon: FileText, color: 'blue' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform ${
                stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                stat.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' :
                'bg-emerald-500/10 text-emerald-500'
              }`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight leading-none">{stat.value}</p>
                <p className="text-sm font-semibold text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">À venir</h2>
          <div className="space-y-4">
            {scheduledInterviews.length > 0 ? (
              scheduledInterviews.map((interview, index) => {
                const statusConfig = getStatusConfig(interview.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-6 hover:border-[#DC2626]/30 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{interview.title}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
                          >
                            {interview.type === 'test' ? 'Test' : 'Entretien'}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-1">
                          {interview.company} - {interview.position}
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          {interview.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {interview.scheduledDate && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {new Date(interview.scheduledDate).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          )}

                          {interview.scheduledTime && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {interview.scheduledTime} ({interview.duration} min)
                              </span>
                            </div>
                          )}

                          {interview.location && (
                            <div className="flex items-center gap-2 text-sm">
                              {interview.location.includes('Visio') ? (
                                <Video className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span>{interview.location}</span>
                            </div>
                          )}

                          {interview.interviewer && (
                            <div className="flex items-center gap-2 text-sm">
                              <StatusIcon className="w-4 h-4 text-muted-foreground" />
                              <span>{interview.interviewer}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">{getActionButton(interview)}</div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun entretien à venir</p>
              </div>
            )}
          </div>
        </div>

        {completedInterviews.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Historique</h2>
            <div className="space-y-4">
              {completedInterviews.map((interview, index) => {
                const statusConfig = getStatusConfig(interview.status);

                return (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleViewDetails(interview)}
                    className="bg-card border border-border rounded-xl p-6 hover:border-[#DC2626]/30 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{interview.title}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
                          >
                            {statusConfig.label}
                          </span>
                          {interview.rating && (
                            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold border border-amber-200">
                              {['', '😠', '😐', '😊', '😍', '🏆'][interview.rating] || '⭐'}
                              <span>{interview.rating}/5</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {interview.company} - {interview.position}
                        </p>
                        <div className="flex items-center gap-4">
                          {interview.scheduledDate && (
                            <p className="text-sm text-muted-foreground">
                              Passé le{' '}
                              {new Date(interview.scheduledDate).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                          {interview.notes && (
                            <p className="text-sm text-primary font-medium flex items-center gap-1 italic">
                              <FileText className="w-3.5 h-3.5" />
                              Commentaires disponibles
                            </p>
                          )}
                        </div>
                      </div>
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedInterview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card/95 backdrop-blur-xl rounded-[2rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border/50 shadow-card hover-lift"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedInterview.title}</h2>
                <p className="text-muted-foreground">
                  {selectedInterview.company} - {selectedInterview.position}
                </p>
              </div>
              <button
                onClick={() => setSelectedInterview(null)}
                className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedInterview.rating && (
              <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                <div className="text-3xl">
                  {['', '😠', '😐', '😊', '😍', '🏆'][selectedInterview.rating] || '⭐'}
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-600 uppercase tracking-wider">Évaluation du Recruteur</p>
                  <p className="text-lg font-bold text-amber-700">{selectedInterview.rating} / 5</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">DESCRIPTION</h3>
                <p className="text-base">{selectedInterview.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedInterview.scheduledDate && (
                  <div className="bg-secondary/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-[#DC2626]" />
                      <span className="text-sm font-semibold">Date</span>
                    </div>
                    <p className="text-base">
                      {new Date(selectedInterview.scheduledDate).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {selectedInterview.scheduledTime && (
                  <div className="bg-secondary/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-[#DC2626]" />
                      <span className="text-sm font-semibold">Heure</span>
                    </div>
                    <p className="text-base">
                      {selectedInterview.scheduledTime} ({selectedInterview.duration} min)
                    </p>
                  </div>
                )}

                {selectedInterview.location && (
                  <div className="bg-secondary/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {selectedInterview.location.includes('Visio') ? (
                        <Video className="w-4 h-4 text-[#DC2626]" />
                      ) : (
                        <MapPin className="w-4 h-4 text-[#DC2626]" />
                      )}
                      <span className="text-sm font-semibold">Lieu</span>
                    </div>
                    <p className="text-base">{selectedInterview.location}</p>
                  </div>
                )}

                {selectedInterview.interviewer && (
                  <div className="bg-secondary/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                      <span className="text-sm font-semibold">Interlocuteur</span>
                    </div>
                    <p className="text-base">{selectedInterview.interviewer}</p>
                  </div>
                )}
              </div>

              {selectedInterview.meetingLink && (
                <div className="bg-gradient-to-br from-[#DC2626]/10 to-[#F87171]/10 border-2 border-[#DC2626]/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="w-5 h-5 text-[#DC2626]" />
                    <span className="font-semibold text-[#DC2626]">Lien de la réunion</span>
                  </div>
                  <button
                    onClick={() => navigate(`/interview/${selectedInterview.id}`)}
                    className="text-base text-[#DC2626] hover:underline break-all text-left"
                  >
                    {selectedInterview.meetingLink}
                  </button>
                </div>
              )}

              {selectedInterview.notes && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-[#DC2626]" />
                    <h3 className="text-sm font-semibold text-muted-foreground">NOTES IMPORTANTES</h3>
                  </div>
                  <p className="text-base bg-secondary/30 rounded-2xl p-4">{selectedInterview.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedInterview(null)}
                  className="flex-1 h-12 bg-secondary hover:bg-secondary/80 rounded-2xl font-semibold transition-colors"
                >
                  Fermer
                </button>
                {selectedInterview.meetingLink && (
                  <button
                    onClick={() => navigate(`/interview/${selectedInterview.id}`)}
                    className="flex-1 h-12 bg-[#DC2626] text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <Video className="w-5 h-5" />
                    Rejoindre
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
