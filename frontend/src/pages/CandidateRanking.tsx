import { useState, useEffect } from 'react';
import { Trophy, Star, Brain, Loader2, BarChart3, Trash2, X, Mail, Phone, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';
import { API_BASE_URL } from '../config';

interface RankedCandidate {
  applicationId: number;
  candidateId: number;
  candidateName?: string;
  matchingScore: number;
  skillsFound: string[];
  recommended: boolean;
  rank: number;
}

interface RankingResult {
  jobPostingId: number;
  totalCandidates: number;
  candidates: RankedCandidate[];
}

export function CandidateRanking() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RankingResult | null>(null);
  const [detailsCandidate, setDetailsCandidate] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    api.get<any[]>('/api/JobPosting')
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => setJobs([]));
  }, []);

  const selectedJobTitle = jobs.find(
    (j) => String(j.jobPostingId ?? j.JobPostingId) === String(selectedJob)
  )?.positionTitle ?? jobs.find(
    (j) => String(j.jobPostingId ?? j.JobPostingId) === String(selectedJob)
  )?.PositionTitle;

  const computeRanking = async () => {
    if (!selectedJob) {
      toast.error('Veuillez choisir une offre d\'emploi.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await api.get<RankingResult>(`/api/Ranking/${selectedJob}`);
      setResult(data);
      toast.success(`Classement calculé : ${data.totalCandidates} candidat(s).`);
    } catch (e: any) {
      toast.error(e?.message || 'Le service de matching IA est indisponible.');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (c: RankedCandidate) => {
    setDetailsCandidate({ ...c, _loading: true });
    setDetailsLoading(true);
    try {
      const app = await api.get<any>(`/api/Application/${c.applicationId}`);
      setDetailsCandidate({ ...c, application: app });
    } catch (e) {
      toast.error('Impossible de charger les informations du candidat.');
      setDetailsCandidate(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const downloadCv = async (cvPath: string) => {
    if (!cvPath) { toast.error('Aucun CV pour ce candidat'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/Application/download/${encodeURIComponent(cvPath)}`);
      if (!res.ok) { toast.error('CV indisponible pour ce candidat'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Erreur lors du téléchargement du CV');
    }
  };

  const handleDelete = async (c: RankedCandidate) => {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement ${c.candidateName || 'ce candidat'} ?`)) return;
    try {
      await api.delete(`/api/Application/${c.applicationId}`);
      toast.success('Candidat supprimé définitivement');
      setResult((prev) => prev
        ? { ...prev, candidates: prev.candidates.filter((x) => x.applicationId !== c.applicationId), totalCandidates: prev.totalCandidates - 1 }
        : prev);
      if (detailsCandidate?.applicationId === c.applicationId) setDetailsCandidate(null);
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const scoreColor = (s: number) =>
    s >= 75 ? 'text-emerald-500' : s >= 50 ? 'text-amber-500' : 'text-red-500';
  const barColor = (s: number) =>
    s >= 75 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-center gap-3 mb-2"
      >
        <motion.div
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
          className="w-12 h-12 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center"
        >
          <Trophy className="w-6 h-6 text-[#DC2626]" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {selectedJobTitle ? `Candidats recommandés — ${selectedJobTitle}` : 'Candidats recommandés'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Score de compatibilité CV/offre — les meilleurs profils sont recommandés automatiquement.
          </p>
        </div>
      </motion.div>

      {/* Sélection de l'offre */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-sm font-bold mb-2 text-muted-foreground">Offre d'emploi</label>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-[#DC2626] transition-shadow"
          >
            <option value="">— Choisir une offre —</option>
            {jobs.map((j) => (
              <option key={j.jobPostingId ?? j.JobPostingId} value={j.jobPostingId ?? j.JobPostingId}>
                {(j.positionTitle ?? j.PositionTitle ?? 'Offre') + ` (#${j.jobPostingId ?? j.JobPostingId})`}
              </option>
            ))}
          </select>
        </div>
        <motion.button
          onClick={computeRanking}
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.97 }}
          className="h-12 px-6 rounded-xl bg-[#DC2626] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-[#DC2626]/10"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
          {loading ? 'Analyse IA…' : 'Calculer le classement'}
        </motion.button>
      </motion.div>

      {/* Résultats */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-10 text-center text-muted-foreground"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 mx-auto mb-3"
          >
            <Brain className="w-8 h-8 text-[#DC2626]" />
          </motion.div>
          L'IA analyse les CV et calcule les scores de compatibilité…
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
      {result && !loading && (
        <motion.div
          key={result.jobPostingId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="mt-8 space-y-3"
        >
          {result.candidates.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-muted-foreground py-10 flex flex-col items-center gap-2"
            >
              <BarChart3 className="w-8 h-8" />
              Aucune candidature à classer pour cette offre.
            </motion.div>
          )}
          {result.candidates.map((c, idx) => (
            <motion.div
              key={c.applicationId}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ y: -2 }}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:shadow-md ${
                c.recommended ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-card'
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: idx * 0.06 + 0.1 }}
                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-black text-lg shrink-0"
              >
                {c.rank}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold truncate">{c.candidateName || `Candidat #${c.candidateId}`}</span>
                  {c.recommended && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.06 + 0.2 }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded-full"
                    >
                      <Star className="w-3 h-3" /> Recommandé
                    </motion.span>
                  )}
                </div>
                <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={`h-full ${barColor(c.matchingScore)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, c.matchingScore)}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.06 + 0.1, ease: 'easeOut' }}
                  />
                </div>
                {c.skillsFound?.length > 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground truncate">
                    Compétences trouvées : {c.skillsFound.join(', ')}
                  </p>
                )}
              </div>
              <div className={`text-2xl font-black shrink-0 ${scoreColor(c.matchingScore)}`}>
                {Math.round(c.matchingScore)}%
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openDetails(c)}
                  title="Détails"
                  className="h-9 px-3 rounded-lg bg-secondary hover:bg-primary hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
                >
                  <Info className="w-3.5 h-3.5" />
                  Détails
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDelete(c)}
                  title="Supprimer définitivement"
                  className="h-9 w-9 rounded-lg bg-secondary hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {detailsCandidate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setDetailsCandidate(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="bg-card border border-border rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailsCandidate(null)}
              className="absolute top-5 right-5 p-2 bg-secondary/50 rounded-xl hover:bg-red-500 hover:text-white active:scale-90 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-black tracking-tight pr-10">
              {detailsCandidate.candidateName || `Candidat #${detailsCandidate.candidateId}`}
            </h2>

            {detailsLoading ? (
              <div className="py-14 text-center text-muted-foreground">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-[#DC2626]" />
                Chargement des informations…
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`text-3xl font-black ${scoreColor(detailsCandidate.matchingScore)}`}>
                    {Math.round(detailsCandidate.matchingScore)}%
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Compatibilité CV</span>
                  {detailsCandidate.recommended && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3" /> Recommandé
                    </span>
                  )}
                </div>

                {detailsCandidate.skillsFound?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Compétences trouvées</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailsCandidate.skillsFound.map((s: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-semibold">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {detailsCandidate.application && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    {(detailsCandidate.application.email || detailsCandidate.application.Email) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {detailsCandidate.application.email || detailsCandidate.application.Email}
                      </div>
                    )}
                    {(detailsCandidate.application.phoneNumber || detailsCandidate.application.PhoneNumber) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {detailsCandidate.application.phoneNumber || detailsCandidate.application.PhoneNumber}
                      </div>
                    )}
                    {(detailsCandidate.application.cvPath || detailsCandidate.application.CvPath) && (
                      <button
                        onClick={() => downloadCv(detailsCandidate.application.cvPath || detailsCandidate.application.CvPath)}
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#DC2626] hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        Voir le CV
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
