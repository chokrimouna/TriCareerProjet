import { useState, useEffect } from 'react';
import { Play, Pause, StopCircle, Clock, Plus, Star, Save } from 'lucide-react';
import { InterviewSession, InterviewSection } from '../util/types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const emojiRatings = [
  { emoji: '⭐', label: 'Excellent', value: 5 },
  { emoji: '😊', label: 'Bien', value: 4 },
  { emoji: '😐', label: 'Moyen', value: 3 },
  { emoji: '😕', label: 'Insuffisant', value: 2 },
  { emoji: '😰', label: 'Mauvais', value: 1 },
];

const defaultSections: InterviewSection[] = [
  { id: '1', title: 'Comportement & Attitude', notes: '', rating: 0, emoji: '' },
  { id: '2', title: 'Gestion du stress', notes: '', rating: 0, emoji: '' },
  { id: '3', title: 'Qualité des réponses', notes: '', rating: 0, emoji: '' },
  { id: '4', title: 'Communication & Expression', notes: '', rating: 0, emoji: '' },
  { id: '5', title: 'Motivation & Engagement', notes: '', rating: 0, emoji: '' },
];

export function ManagerInterview() {
  const [session, setSession] = useState<InterviewSession>({
    id: '1',
    interviewId: '1',
    candidateName: 'Sophie Martin',
    position: 'Développeur Full Stack',
    status: 'not_started',
    duration: 3600,
    elapsedTime: 0,
    sections: defaultSections,
  });

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (session.status === 'in_progress') {
      interval = setInterval(() => {
        setSession(prev => ({
          ...prev,
          elapsedTime: prev.elapsedTime + 1,
        }));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [session.status]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStart = () => {
    setSession({
      ...session,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    });
    toast.success('Entretien démarré !');
  };

  const handlePause = () => {
    setSession({
      ...session,
      status: 'paused',
      pausedAt: new Date().toISOString(),
    });
    toast.info('Entretien mis en pause');
  };

  const handleResume = () => {
    setSession({ ...session, status: 'in_progress' });
    toast.success('Entretien repris');
  };

  const handleStop = () => {
    setSession({
      ...session,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    toast.success('Entretien terminé !');
  };

  const handleSectionUpdate = (
    sectionId: string,
    field: keyof InterviewSection,
    value: string | number
  ) => {
    setSession({
      ...session,
      sections: session.sections.map(s =>
        s.id === sectionId ? { ...s, [field]: value } : s
      ),
    });
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) {
      toast.error('Veuillez saisir un titre');
      return;
    }

    const newSection: InterviewSection = {
      id: `${session.sections.length + 1}`,
      title: newSectionTitle,
      notes: '',
      rating: 0,
      emoji: '',
    };

    setSession({
      ...session,
      sections: [...session.sections, newSection],
    });
    setNewSectionTitle('');
    setShowAddSection(false);
    toast.success('Section ajoutée');
  };

  const handleSave = () => {
    toast.success('Notes sauvegardées avec succès');
  };

  const currentSection = session.sections[currentSectionIndex];
  const completedSections = session.sections.filter(s => s.rating > 0).length;
  const progress = (completedSections / session.sections.length) * 100;

  if (session.status === 'not_started') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-card border border-border rounded-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Entretien avec {session.candidateName}</h1>
            <p className="text-muted-foreground">{session.position}</p>
          </div>

          <div className="bg-secondary rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-4">Critères d'évaluation :</h3>
            <ul className="space-y-2">
              {session.sections.map((section, index) => (
                <li key={section.id} className="flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  {section.title}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 mb-8">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Évaluez le candidat selon son comportement, ses réponses et sa gestion du stress pendant l'entretien.
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Commencer l'entretien
          </button>
        </motion.div>
      </div>
    );
  }

  if (session.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl w-full bg-card border border-border rounded-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <StopCircle className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Entretien terminé !</h1>
            <p className="text-muted-foreground">
              Durée totale : {formatTime(session.elapsedTime)}
            </p>
          </div>

          <div className="space-y-4">
            {session.sections.map((section) => (
              <div key={section.id} className="bg-secondary rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{section.title}</h3>
                  {section.emoji && (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{section.emoji}</span>
                      <div className="flex">
                        {Array.from({ length: section.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {section.notes && (
                  <p className="text-sm text-muted-foreground">{section.notes}</p>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-8"
          >
            <Save className="w-5 h-5" />
            Sauvegarder le rapport
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">{session.candidateName}</h2>
              <p className="text-sm text-muted-foreground">{session.position}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 font-mono font-bold text-lg">
                <Clock className="w-5 h-5 text-primary" />
                {formatTime(session.elapsedTime)}
              </div>
              <div className="flex gap-2">
                {session.status === 'in_progress' ? (
                  <button
                    onClick={handlePause}
                    className="h-10 px-4 bg-warning text-warning-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    className="h-10 px-4 bg-success text-success-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Reprendre
                  </button>
                )}
                <button
                  onClick={handleStop}
                  className="h-10 px-4 bg-error text-error-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <StopCircle className="w-4 h-4" />
                  Terminer
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {completedSections}/{session.sections.length} sections
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            {session.sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => setCurrentSectionIndex(index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  index === currentSectionIndex
                    ? 'border-primary bg-primary/10'
                    : section.rating > 0
                    ? 'border-success/30 bg-success/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{section.title}</span>
                  {section.emoji && <span className="text-lg">{section.emoji}</span>}
                </div>
                {section.rating > 0 && (
                  <div className="flex">
                    {Array.from({ length: section.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-warning fill-warning" />
                    ))}
                  </div>
                )}
              </button>
            ))}

            <button
              onClick={() => setShowAddSection(true)}
              className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Ajouter section</span>
            </button>
          </div>

          <div className="lg:col-span-3">
            <motion.div
              key={currentSectionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-xl p-8"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{currentSection.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Évaluez le candidat sur ce critère en observant son comportement et ses réponses
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3">Évaluation</label>
                  <div className="flex gap-3">
                    {emojiRatings.map((rating) => (
                      <button
                        key={rating.emoji}
                        onClick={() => {
                          handleSectionUpdate(currentSection.id, 'emoji', rating.emoji);
                          handleSectionUpdate(currentSection.id, 'rating', rating.value);
                        }}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          currentSection.emoji === rating.emoji
                            ? 'border-primary bg-primary/10 shadow-lg scale-105'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="text-3xl">{rating.emoji}</span>
                        <span className="text-xs font-medium text-center">{rating.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Notes et observations</label>
                  <textarea
                    value={currentSection.notes}
                    onChange={(e) =>
                      handleSectionUpdate(currentSection.id, 'notes', e.target.value)
                    }
                    placeholder="Notez vos observations : Questions posées, qualité des réponses, comportement du candidat, gestion du stress..."
                    className="w-full h-64 px-4 py-3 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <button
                    onClick={() =>
                      setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))
                    }
                    disabled={currentSectionIndex === 0}
                    className="h-11 px-6 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Critère précédent
                  </button>

                  <button
                    onClick={handleSave}
                    className="h-11 px-6 bg-success text-success-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </button>

                  {currentSectionIndex < session.sections.length - 1 ? (
                    <button
                      onClick={() =>
                        setCurrentSectionIndex(
                          Math.min(session.sections.length - 1, currentSectionIndex + 1)
                        )
                      }
                      className="h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Critère suivant
                    </button>
                  ) : (
                    <button
                      onClick={handleStop}
                      className="h-11 px-6 bg-error text-error-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <StopCircle className="w-4 h-4" />
                      Terminer
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddSection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-xl p-6 max-w-md w-full border border-border"
            >
              <h3 className="text-xl font-semibold mb-4">Ajouter une section</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titre de la section</label>
                  <input
                    type="text"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="Ex: Motivations et objectifs"
                    className="w-full h-11 px-4 bg-input-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddSection(false)}
                  className="flex-1 h-11 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddSection}
                  className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Ajouter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
