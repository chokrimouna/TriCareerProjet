import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Sparkles, CheckCircle, XCircle, Eye, Trash2, Archive } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';
import { API_BASE_URL } from '../config';

interface AnalyzedCV {
  id: string;
  fileName: string;
  storedName: string;
  jobPostingId: string;
  candidateName: string;
  candidateEmail: string;
  matchingScore: number;
  status: 'analyzing' | 'preselected' | 'rejected';
  skills: string[];
  experience: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  analyzedAt: string;
}

// Clé de stockage local : les résultats d'analyse sont ENREGISTRÉS et survivent
// au rafraîchissement / changement de page (demande encadrante).
const CV_ANALYSIS_STORAGE_KEY = 'tricareer_cv_analyses';

export function RHCVAnalysis() {
  const [analyzedCVs, setAnalyzedCVs] = useState<AnalyzedCV[]>(() => {
    try {
      const raw = localStorage.getItem(CV_ANALYSIS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AnalyzedCV[]) : [];
    } catch {
      return [];
    }
  });

  // Enregistre automatiquement chaque changement des résultats d'analyse
  useEffect(() => {
    try {
      localStorage.setItem(CV_ANALYSIS_STORAGE_KEY, JSON.stringify(analyzedCVs));
    } catch {
      /* stockage plein / indisponible : on ignore */
    }
  }, [analyzedCVs]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCV, setSelectedCV] = useState<AnalyzedCV | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<any[]>('/api/JobPosting')
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => setJobs([]));
  }, []);

  const getToken = () =>
    localStorage.getItem('tricareer_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('tricareer_token') || '';

  // Glisser-déposer natif HTML5 (pas de dépendance à un DndProvider react-dnd)
  const [isOver, setIsOver] = useState(false);
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setIsOver(true); },
    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); setIsOver(false); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      if (e.dataTransfer?.files?.length) {
        handleFileDrop(Array.from(e.dataTransfer.files));
      }
    },
  };

  // Analyse RÉELLE : chaque CV est envoyé à l'API, analysé par l'IA contre l'offre choisie
  const handleFileDrop = async (files: File[], jobOverride?: string) => {
    const job = jobOverride || selectedJob;
    if (!job) {
      toast.error("Choisissez d'abord une offre d'emploi pour le matching.");
      return;
    }
    setIsAnalyzing(true);
    const results: AnalyzedCV[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fd = new FormData();
        fd.append('cv', file);
        fd.append('jobPostingId', job);
        const res = await fetch(`${API_BASE_URL}/api/Analysis/analyze-cv`, {
          method: 'POST',
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
          body: fd,
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          toast.error(data.error || `Échec de l'analyse de ${file.name}`);
          continue;
        }
        const score = Math.round(data.matchingScore || 0);
        results.push({
          id: Date.now().toString() + i,
          fileName: file.name,
          storedName: data.storedName || '',
          jobPostingId: job,
          candidateName: `Candidat ${analyzedCVs.length + results.length + 1}`,
          candidateEmail: '',
          matchingScore: score,
          status: score >= 70 ? 'preselected' : 'rejected',
          skills: Array.isArray(data.skills) ? data.skills : [],
          experience: '',
          summary: data.summary || '',
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
          analyzedAt: new Date().toISOString(),
        });
      } catch (e: any) {
        toast.error(`Erreur lors de l'analyse de ${file.name}`);
      }
    }

    setAnalyzedCVs((prev) => [...prev, ...results]);
    setIsAnalyzing(false);
    if (results.length) toast.success(`${results.length} CV(s) analysé(s) par l'IA.`);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      handleFileDrop(Array.from(e.target.files));
    }
    // réinitialise pour pouvoir re-sélectionner le même fichier
    e.target.value = '';
  };

  // Démo « 1 clic » : analyse un CV d'exemple déjà embarqué dans l'app (aucun fichier à
  // fournir). Choisit automatiquement une offre + un CV adapté, télécharge le CV depuis
  // le serveur, puis lance la VRAIE analyse IA. Pratique pour présenter sur n'importe quel PC.
  const analyzeSample = async () => {
    let jobId = selectedJob;
    if (!jobId && jobs.length) {
      jobId = String(jobs[0].jobPostingId ?? jobs[0].JobPostingId);
      setSelectedJob(jobId);
    }
    if (!jobId) { toast.error("Aucune offre disponible."); return; }

    const job = jobs.find((j) => String(j.jobPostingId ?? j.JobPostingId) === String(jobId));
    const title = (job?.positionTitle ?? job?.PositionTitle ?? '').toLowerCase();
    let sample = 'cv_testameny.pdf'; // profil web par défaut
    if (title.includes('ing') || title.includes('dev') || title.includes('logiciel') || title.includes('data')) sample = 'cv_testtest.pdf';
    else if (title.includes('design') && !title.includes('web')) sample = 'cv_designer.pdf';

    try {
      setIsAnalyzing(true);
      const res = await fetch(`${API_BASE_URL}/api/Application/download/${encodeURIComponent(sample)}`);
      if (!res.ok) { toast.error("CV d'exemple indisponible."); setIsAnalyzing(false); return; }
      const blob = await res.blob();
      const file = new File([blob], sample, { type: 'application/pdf' });
      await handleFileDrop([file], jobId);
    } catch {
      toast.error("Erreur lors de l'analyse du CV d'exemple.");
      setIsAnalyzing(false);
    }
  };

  // Archive un CV analysé : crée une candidature archivée (visible dans la page Archives)
  const archiveCv = async (cv: AnalyzedCV) => {
    if (!cv.storedName) { toast.error("Impossible d'archiver ce CV."); return; }
    try {
      await api.post('/api/Analysis/archive-cv', {
        storedName: cv.storedName,
        jobPostingId: Number(cv.jobPostingId) || 0,
        candidateName: cv.candidateName,
        email: cv.candidateEmail,
        matchingScore: cv.matchingScore,
      });
      toast.success('Candidature archivée');
      setAnalyzedCVs((prev) => prev.filter(c => c.id !== cv.id));
      setSelectedCV(null);
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'archivage");
    }
  };

  const preselectedCVs = analyzedCVs.filter(cv => cv.status === 'preselected');
  const rejectedCVs = analyzedCVs.filter(cv => cv.status === 'rejected');

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#16A34A]';
    if (score >= 70) return 'text-[#65A30D]';
    if (score >= 50) return 'text-[#EA580C]';
    return 'text-[#DC2626]';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 90) return 'from-[#16A34A]/10 to-[#22C55E]/10 border-[#16A34A]/30';
    if (score >= 70) return 'from-[#65A30D]/10 to-[#84CC16]/10 border-[#65A30D]/30';
    if (score >= 50) return 'from-[#EA580C]/10 to-[#F97316]/10 border-[#EA580C]/30';
    return 'from-[#DC2626]/10 to-[#EF4444]/10 border-[#DC2626]/30';
  };

  return (
    <div className="p-8 space-y-8">
      {/* Input fichier unique, déclenché par .click() (fiable sur tous les navigateurs) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyse IA des CV</h1>
          <p className="text-muted-foreground font-medium">
            Glissez-déposez vos CV pour une analyse automatique et un score de matching
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/cvs-archive'}
          className="h-12 px-6 bg-card border border-border rounded-2xl font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
        >
          <Archive className="w-5 h-5" />
          Candidatures archivées
        </button>
      </div>

      {/* Offre d'emploi : le score de matching des CV est calculé par rapport à cette offre */}
      <div className="max-w-md">
        <label className="block text-sm font-semibold mb-2 text-muted-foreground">
          Offre d'emploi (pour le matching)
        </label>
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full h-12 px-4 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
        >
          <option value="">— Choisir une offre —</option>
          {jobs.map((j) => (
            <option key={j.jobPostingId ?? j.JobPostingId} value={j.jobPostingId ?? j.JobPostingId}>
              {(j.positionTitle ?? j.PositionTitle ?? 'Offre') + ` (#${j.jobPostingId ?? j.JobPostingId})`}
            </option>
          ))}
        </select>
        {/* Démo 1 clic : analyse un CV d'exemple embarqué (aucun fichier à fournir) */}
        <button
          type="button"
          onClick={analyzeSample}
          disabled={isAnalyzing}
          className="mt-3 inline-flex items-center gap-2 h-11 px-5 bg-gradient-to-r from-[#DC2626] to-[#F87171] text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
        >
          <Sparkles className="w-5 h-5" />
          {isAnalyzing ? 'Analyse en cours…' : "Analyser un CV d'exemple"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#DC2626] via-[#EF4444] to-[#F87171] rounded-3xl p-3 text-white shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl" />
          <div className="relative">
            <p className="text-3xl font-bold mb-1">{analyzedCVs.length}</p>
            <p className="text-xs opacity-90">CV analysés</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden bg-card/50 backdrop-blur-xl rounded-3xl p-3 border border-border/50 shadow-xl"
        >
          <div className="relative">
            <p className="text-3xl font-bold mb-1 text-[#16A34A]">{preselectedCVs.length}</p>
            <p className="text-xs text-muted-foreground">Présélectionnés (≥70%)</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden bg-card/50 backdrop-blur-xl rounded-3xl p-3 border border-border/50 shadow-xl"
        >
          <div className="relative">
            <p className="text-3xl font-bold mb-1 text-[#DC2626]">{rejectedCVs.length}</p>
            <p className="text-xs text-muted-foreground">Sous le seuil (&lt;70%)</p>
          </div>
        </motion.div>
      </div>

      {analyzedCVs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div
              {...dropHandlers}
              className={`border-2 border-dashed rounded-2xl p-8 transition-all ${
                isOver
                  ? 'border-[#DC2626] bg-gradient-to-br from-[#DC2626]/10 to-[#F87171]/10 scale-105'
                  : 'border-border bg-card hover:border-[#DC2626]/50'
              }`}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#DC2626]/20 to-[#F87171]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {isAnalyzing ? (
                    <Sparkles className="w-8 h-8 text-[#DC2626] animate-pulse" />
                  ) : (
                    <Upload className="w-8 h-8 text-[#DC2626]" />
                  )}
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {isAnalyzing ? 'Analyse en cours...' : 'Ajouter des CV'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Glissez ou cliquez
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 h-10 px-4 bg-gradient-to-r from-[#DC2626] to-[#F87171] text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all cursor-pointer text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Parcourir
                </button>
                <p className="text-xs text-muted-foreground mt-3">
                  PDF, DOC, DOCX
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-2xl font-semibold">Résultats de l'analyse</h2>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A34A]/10 text-[#16A34A] text-xs font-semibold border border-[#16A34A]/30">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Résultats enregistrés
                </span>
                <button
                  onClick={() => {
                    setAnalyzedCVs([]);
                    setSelectedCV(null);
                    localStorage.removeItem(CV_ANALYSIS_STORAGE_KEY);
                    toast.success('Résultats effacés');
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-secondary/60 hover:bg-secondary text-xs font-medium transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vider
                </button>
              </div>
            </div>
            {analyzedCVs.map((cv, index) => (
              <motion.div
                key={cv.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedCV(cv)}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{cv.candidateName}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{cv.candidateEmail}</p>
                    <p className="text-xs text-muted-foreground">{cv.fileName}</p>
                  </div>
                  <div className={`bg-gradient-to-br ${getScoreBackground(cv.matchingScore)} border-2 rounded-2xl p-4 text-center min-w-[100px]`}>
                    <div className={`text-3xl font-bold ${getScoreColor(cv.matchingScore)}`}>
                      {cv.matchingScore}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Matching</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {cv.status === 'preselected' ? (
                    <span className="px-4 py-1.5 bg-gradient-to-r from-[#16A34A]/20 to-[#22C55E]/20 text-[#16A34A] rounded-full text-sm font-semibold border border-[#16A34A]/30 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Présélectionné
                    </span>
                  ) : (
                    <span className="px-4 py-1.5 bg-gradient-to-r from-[#DC2626]/20 to-[#EF4444]/20 text-[#DC2626] rounded-full text-sm font-semibold border border-[#DC2626]/30 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Sous le seuil
                    </span>
                  )}
                </div>

                {/* Résumé IA */}
                {cv.summary && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{cv.summary}</p>
                )}

                {/* Compétences détectées */}
                <p className="text-xs font-semibold text-muted-foreground mb-2">Compétences détectées</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {cv.skills.length > 0 ? (
                    cv.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-[#DC2626]/10 text-[#DC2626] rounded-lg text-xs font-medium">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Aucune compétence détectée</span>
                  )}
                </div>

                {/* Points forts / Points d'attention affichés directement */}
                {(cv.strengths.length > 0 || cv.weaknesses.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs font-semibold text-[#16A34A] mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Points forts
                      </p>
                      <div className="space-y-1">
                        {cv.strengths.slice(0, 3).map((s, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs">
                            <span className="text-[#16A34A] mt-0.5">•</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#EA580C] mb-2 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Points d'attention
                      </p>
                      <div className="space-y-1">
                        {cv.weaknesses.slice(0, 3).map((w, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs">
                            <span className="text-[#EA580C] mt-0.5">•</span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div
          {...dropHandlers}
          className={`border-2 border-dashed rounded-2xl p-12 transition-all ${
            isOver
              ? 'border-[#DC2626] bg-gradient-to-br from-[#DC2626]/10 to-[#F87171]/10 scale-105'
              : 'border-border bg-card hover:border-[#DC2626]/50'
          }`}
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#DC2626]/20 to-[#F87171]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {isAnalyzing ? (
                <Sparkles className="w-10 h-10 text-[#DC2626] animate-pulse" />
              ) : (
                <Upload className="w-10 h-10 text-[#DC2626]" />
              )}
            </div>
            <h3 className="text-xl font-bold mb-2">
              {isAnalyzing ? 'Analyse en cours...' : 'Glissez vos CV ici'}
            </h3>
            <p className="text-muted-foreground mb-4">
              ou cliquez pour parcourir vos fichiers
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 h-12 px-6 bg-gradient-to-r from-[#DC2626] to-[#F87171] text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              <FileText className="w-5 h-5" />
              Sélectionner des fichiers
            </button>
            <p className="text-xs text-muted-foreground mt-4">
              Formats acceptés: PDF, DOC, DOCX (max 10MB par fichier)
            </p>
          </div>
        </div>
      )}

      {analyzedCVs.length > 0 && selectedCV && (
        <div className="fixed right-8 top-24 w-96">
          <div className="lg:col-span-1">
            {selectedCV ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border border-border rounded-2xl p-6 sticky top-24 space-y-6"
              >
                <div>
                  <h3 className="font-semibold mb-4">Détails de l'analyse</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Points forts</p>
                      <div className="space-y-2">
                        {selectedCV.strengths.map((strength, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-[#16A34A] mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{strength}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Points d'attention</p>
                      <div className="space-y-2">
                        {selectedCV.weaknesses.map((weakness, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-[#EA580C] mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{weakness}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <button className="w-full h-10 bg-[#DC2626] text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    Voir le CV complet
                  </button>
                  {selectedCV.status === 'preselected' ? (
                    <button className="w-full h-10 bg-[#16A34A] text-white rounded-lg font-medium hover:shadow-lg transition-all">
                      Planifier entretien
                    </button>
                  ) : (
                    <button
                      onClick={() => archiveCv(selectedCV)}
                      className="w-full h-10 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      Archiver
                    </button>
                  )}
                  <button
                    onClick={() => {
                      toast.success('CV supprimé');
                      setAnalyzedCVs(analyzedCVs.filter(c => c.id !== selectedCV.id));
                      setSelectedCV(null);
                    }}
                    className="w-full h-10 bg-error/10 text-error rounded-lg font-medium hover:bg-error/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Sélectionnez un CV pour voir les détails</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
