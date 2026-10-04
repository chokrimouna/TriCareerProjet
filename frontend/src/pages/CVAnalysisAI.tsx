import { useState, useEffect } from 'react';
import { Brain, Loader2, ThumbsUp, ThumbsDown, AlertTriangle, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';

interface Analysis {
  skills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary?: string;
  error?: string;
}

interface Candidate {
  applicationId: number;
  candidateName?: string;
  matchingScore: number;
}

export function CVAnalysisAI() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    api.get<any[]>('/api/JobPosting').then((d) => setJobs(Array.isArray(d) ? d : [])).catch(() => setJobs([]));
  }, []);

  const loadCandidates = async () => {
    if (!selectedJob) { toast.error('Choisis une offre.'); return; }
    setLoadingCandidates(true); setCandidates([]); setSelected(null); setAnalysis(null); setReport(null);
    try {
      const data = await api.get<{ candidates: Candidate[] }>(`/api/Ranking/${selectedJob}`);
      setCandidates(data.candidates || []);
      if (!data.candidates?.length) toast.info('Aucune candidature avec CV pour cette offre.');
    } catch (e: any) { toast.error(e?.message || 'Erreur de chargement.'); }
    finally { setLoadingCandidates(false); }
  };

  const analyze = async (c: Candidate) => {
    setSelected(c); setAnalysis(null); setReport(null); setAnalyzing(true);
    try {
      const data = await api.get<Analysis>(`/api/Analysis/${c.applicationId}`);
      if (data.error) { toast.error(data.error); setAnalysis(null); }
      else setAnalysis(data);
    } catch (e: any) { toast.error(e?.message || 'Le service d\'analyse IA est indisponible.'); }
    finally { setAnalyzing(false); }
  };

  const generateReport = async () => {
    if (!selected) return;
    setReporting(true); setReport(null);
    try {
      const data = await api.post<any>(`/api/Analysis/${selected.applicationId}/report`, {});
      if (data.error) { toast.error(data.error); }
      else { setReport(data.content ? JSON.parse(data.content) : null); toast.success('Rapport généré et enregistré.'); }
    } catch (e: any) { toast.error(e?.message || 'Erreur génération rapport.'); }
    finally { setReporting(false); }
  };

  const Chips = ({ items, color }: { items: string[]; color: string }) => (
    <div className="flex flex-wrap gap-2">
      {items.map((s, i) => <span key={i} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>{s}</span>)}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center">
          <Brain className="w-6 h-6 text-[#DC2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Analyse IA des CV</h1>
          <p className="text-sm text-muted-foreground">Forces, faiblesses, compétences manquantes et rapport d'évaluation.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-6">
        <div className="flex-1">
          <label className="block text-sm font-bold mb-2 text-muted-foreground">Offre d'emploi</label>
          <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-[#DC2626]">
            <option value="">— Choisir une offre —</option>
            {jobs.map((j) => (
              <option key={j.jobPostingId ?? j.JobPostingId} value={j.jobPostingId ?? j.JobPostingId}>
                {(j.positionTitle ?? j.PositionTitle ?? 'Offre') + ` (#${j.jobPostingId ?? j.JobPostingId})`}
              </option>
            ))}
          </select>
        </div>
        <button onClick={loadCandidates} disabled={loadingCandidates}
          className="h-12 px-6 rounded-xl bg-[#DC2626] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {loadingCandidates ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          Charger les candidats
        </button>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* Liste des candidats */}
        <div className="space-y-2">
          {candidates.map((c) => (
            <button key={c.applicationId} onClick={() => analyze(c)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.applicationId === c.applicationId ? 'border-[#DC2626] bg-[#DC2626]/5' : 'border-border bg-card hover:border-[#DC2626]/40'}`}>
              <div className="font-bold truncate">{c.candidateName || `Candidat #${c.applicationId}`}</div>
              <div className="text-xs text-muted-foreground">Matching : {Math.round(c.matchingScore)}%</div>
            </button>
          ))}
          {candidates.length === 0 && <p className="text-sm text-muted-foreground">Aucun candidat chargé.</p>}
        </div>

        {/* Détail de l'analyse */}
        <div>
          {analyzing && (
            <div className="text-center text-muted-foreground py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#DC2626]" />
              Analyse IA du CV en cours…
            </div>
          )}

          {analysis && !analyzing && (
            <div className="space-y-5">
              {analysis.summary && <p className="text-sm bg-secondary/50 rounded-xl p-3">{analysis.summary}</p>}

              <div>
                <h3 className="flex items-center gap-2 font-bold mb-2"><ThumbsUp className="w-4 h-4 text-emerald-500" /> Points forts</h3>
                <ul className="list-disc list-inside text-sm space-y-1">{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-bold mb-2"><ThumbsDown className="w-4 h-4 text-red-500" /> Points faibles</h3>
                <ul className="list-disc list-inside text-sm space-y-1">{analysis.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-bold mb-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Compétences manquantes</h3>
                <Chips items={analysis.missingSkills} color="bg-amber-500/15 text-amber-600" />
              </div>
              {analysis.skills?.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2">Compétences détectées</h3>
                  <Chips items={analysis.skills} color="bg-emerald-500/15 text-emerald-600" />
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <button onClick={generateReport} disabled={reporting}
                  className="h-11 px-5 rounded-xl bg-foreground text-background font-bold flex items-center gap-2 disabled:opacity-60">
                  {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Générer le rapport d'évaluation
                </button>
              </div>

              {report && (
                <div className="mt-4 rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-lg">{report.rapport_titre || "Rapport d'évaluation"}</h3>
                    {typeof report.score_general !== 'undefined' && (
                      <span className="text-2xl font-black text-[#DC2626]">{report.score_general}/100</span>
                    )}
                  </div>
                  {report.resume_general && <p className="text-sm text-muted-foreground">{report.resume_general}</p>}
                  {report.verdict_global && (
                    <p className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <strong>Verdict :</strong> {report.verdict_global}</p>
                  )}
                  {Array.isArray(report.recommandations) && report.recommandations.length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm mb-1">Recommandations</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">{report.recommandations.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!analysis && !analyzing && (
            <div className="text-center text-muted-foreground py-16">
              Sélectionne un candidat à gauche pour lancer l'analyse IA.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
