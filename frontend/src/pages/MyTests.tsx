import { useState, useEffect } from 'react';
import { PlayCircle, Clock, FileCheck, AlertCircle, TrendingUp, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { api } from '../helpers/apiClient';

interface TestItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  totalPoints: number;
  status: 'available' | 'completed';
  scheduledDate?: string;
  scheduledTime?: string;
  availableUntil?: string;
  score?: number;
  completedAt?: string;
  timeSpent?: number;
}

export function MyTests() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useSelector((s: RootState) => s.auth.user);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const userEmail = String(
          currentUser?.Email ?? (currentUser as any)?.email ?? ''
        ).toLowerCase();
        const currentUserId = String(currentUser?.Id ?? (currentUser as any)?.id ?? (currentUser as any)?.userId ?? '');

        if (!userEmail && !currentUserId) {
          setLoading(false);
          return;
        }

        // Step 1: Find candidate applications by email
        const allApps = await api.get<any[]>(
          '/api/Application/getAllApps'
        ).catch(() => []);

        console.log('Searching for apps with email:', userEmail, 'or userId:', currentUserId);
        const myApps = (Array.isArray(allApps) ? allApps : [])
          .filter((a: any) => {
            const appEmail = String(
              a?.Email ?? a?.email ?? ''
            ).toLowerCase().trim();
            const aUserId = String(a?.UserId ?? a?.userId ?? '');
            return (userEmail && appEmail === userEmail) || (currentUserId && aUserId === currentUserId);
          });

        console.log('My applications found:', myApps);

        if (myApps.length === 0) {
          console.warn('No applications found for this email.');
          setTests([]);
          setLoading(false);
          return;
        }

        const myAppIds = myApps
          .map((a: any) =>
            Number(a?.ApplicationId ?? a?.applicationId ?? 0)
          )
          .filter(id => id > 0);

        // Step 2: Get Sessions (real tests) for these applications
        console.log('Finding sessions for apps:', myAppIds);
        let sessionTests: TestItem[] = [];

        for (const appId of myAppIds) {
          console.log(`Fetching sessions for appId: ${appId}`);
          const sessions = await api.get<any[]>(
            `/api/Sessions/GetSessionAllByIdApp/${appId}`
          ).catch((err) => {
            console.error(`Error fetching sessions for appId ${appId}:`, err);
            return [];
          });

          console.log(`Sessions found for appId ${appId}:`, sessions);

          if (Array.isArray(sessions) && sessions.length > 0) {
            const mapped = sessions.map((item: any) => {
              // The backend returns a SessionDetailDto which contains a 'session' property
              const s = item?.session ?? item?.Session ?? item; 
              const examn = s?.examn ?? s?.Examn ?? s?.Examen ?? s?.examen ?? null;
              
              const encId = s?.encryptedSessinId ?? s?.EncryptedSessinId ?? '';
              const sessionId = s?.sessionId ?? s?.SessionId ?? '';
              
              const isCompleted = s?.sessionState === true || s?.SessionState === true;
              
              const title = examn?.titre ?? examn?.Titre ?? examn?.title ?? 'Test Technique';
              const isNonQuiz = title.toLowerCase().includes('design') || 
                               title.toLowerCase().includes('code') || 
                               title.toLowerCase().includes('redaction');

              return {
                id: encId || String(sessionId) || String(s?.idSession ?? s?.IdSession ?? ''),
                title: title,
                description: examn?.description ?? examn?.Description ?? 'Test technique assigné',
                duration: item?.totalduree ? Math.round(item.totalduree / 60) : (item?.Totalduree ? Math.round(item.Totalduree / 60) : (examn?.duration ?? examn?.Duration ?? (isNonQuiz ? 30 : 60))),
                totalQuestions: (examn?.detailsExamen ?? examn?.DetailsExamen ?? []).length,
                totalPoints: item?.totalBarem ?? 100,
                status: (s?.score != null || s?.Score != null || isCompleted) ? 'completed' : 'available',
                availableUntil: s?.expiresAt ?? s?.ExpiresAt,
                score: s?.score ?? s?.Score ?? undefined,
                completedAt: isCompleted ? (s?.createdAt ?? s?.CreatedAt ?? null) : null,
              } as TestItem;
            });
            sessionTests = [...sessionTests, ...mapped];
          }
        }

        setTests(sessionTests);

      } catch (e) {
        console.error('MyTests load error:', e);
        setTests([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [(currentUser as any)?.Id, (currentUser as any)?.Email]);

  const handleStartTest = (test: TestItem) => {
    if (!test.id || test.id === 'undefined') {
      console.error('Test ID is missing', test);
      return;
    }
    navigate(`/test/${test.id}`);
  };

  const availableTests = tests.filter(t => t.status === 'available');
  const completedTests = tests.filter(t => t.status === 'completed');
  const averageScore = completedTests.length > 0
    ? Math.round(completedTests.reduce((sum, t) => sum + (t.score || 0), 0) / completedTests.length)
    : 0;

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
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Mes Tests Techniques</h1>
        <p className="text-muted-foreground font-medium">
          Passez vos évaluations techniques et suivez votre progression.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Tests disponibles', value: availableTests.length, icon: PlayCircle, color: 'primary' },
          { label: 'Tests complétés', value: completedTests.length, icon: FileCheck, color: 'emerald' },
          { label: 'Total Assignés', value: tests.length, icon: FileText, color: 'blue' },
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

      {availableTests.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Mes entretiens et tests</h2>
          <div className="grid grid-cols-1 gap-4">
            {availableTests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-xl p-8 hover:border-primary/50 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-8">
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold mb-3">{test.title}</h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">{test.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DC2626]/10 to-[#F87171]/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-[#DC2626]" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Durée</p>
                          <p className="font-semibold">{test.duration} min</p>
                        </div>
                      </div>
                      
                      {!(test.title.toLowerCase().includes('design') || test.title.toLowerCase().includes('code') || test.title.toLowerCase().includes('redaction')) && (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DC2626]/10 to-[#F87171]/10 flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-[#DC2626]" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Questions</p>
                              <p className="font-semibold">{test.totalQuestions}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DC2626]/10 to-[#F87171]/10 flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 text-[#DC2626]" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Points</p>
                              <p className="font-semibold">{test.totalPoints}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {test.availableUntil && (
                      <div className="bg-muted/50 border border-border rounded-lg p-4 inline-flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Disponible jusqu'au{' '}
                          {new Date(test.availableUntil).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-4">
                    <button
                      onClick={() => handleStartTest(test)}
                      className="h-10 px-6 bg-[#DC2626] text-white rounded-xl font-bold hover:bg-[#B91C1C] transition-all flex items-center gap-2 shadow-md active:scale-95"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Commencer
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {availableTests.length === 0 && completedTests.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <PlayCircle className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
          <h3 className="text-2xl font-semibold mb-3">Aucun test disponible</h3>
          <p className="text-muted-foreground">
            Vos entretiens et tests planifiés apparaîtront ici
          </p>
        </div>
      )}
    </div>
  );
}
