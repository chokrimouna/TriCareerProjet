import { useState } from 'react';
import { Archive, Search, Filter, Eye, Trash2, Calendar, Mail, Briefcase, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface ArchivedCV {
  id: string;
  candidateName: string;
  candidateEmail: string;
  fileName: string;
  position: string;
  archivedDate: string;
  matchingScore: number;
  rejectionReason: string;
  skills: string[];
  experience: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  decision: 'accepted' | 'rejected';
}

// Dummy data removed as it is now fetched from the API
import { useApplications } from '../hooks/useApplications';
import { api } from '../helpers/apiClient';

export function CVsArchive() {
  const { data: apps, loading, refetch } = useApplications();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCV, setSelectedCV] = useState<ArchivedCV | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const archivedCVs: ArchivedCV[] = apps
    .filter((app: any) => {
      const state = app.IdState ?? app.idState;
      const status = (app.Status ?? app.status ?? '').toString().toLowerCase();
      // Candidatures archivées : acceptées (IdState=2) ou refusées (IdState=4) — décision finale prise
      return state === 2 || state === 4 || status.includes('accept') || status.includes('reject') || status.includes('archiv');
    })
    .map((app: any) => {
      const state = app.IdState ?? app.idState;
      const status = (app.Status ?? app.status ?? '').toString().toLowerCase();
      const decision: 'accepted' | 'rejected' = (state === 2 || status.includes('accept')) ? 'accepted' : 'rejected';
      return {
        id: String(app.ApplicationId ?? app.applicationId ?? app.Id ?? app.id ?? ''),
        candidateName: app.NameApplication ?? app.nameApplication ?? 'Unknown',
        candidateEmail: app.Email ?? app.email ?? '',
        fileName: app.CvPath ?? app.cvPath ?? '',
        position: app.JobPosting?.PositionTitle ?? app.JobPosting?.positionTitle ?? 'Position',
        archivedDate: app.ApplicationDate ?? app.applicationDate ?? new Date().toISOString(),
        matchingScore: Number(app.CvScore ?? app.cvScore ?? 0),
        rejectionReason: app.RejectionReason ?? app.rejectionReason ?? (decision === 'accepted' ? '' : 'Score insuffisant'),
        skills: (app.Skills ?? app.skills ?? '').split(',').filter(Boolean),
        experience: app.Experience ?? app.experience ?? 'N/A',
        summary: app.AiAnalysis ?? app.aiAnalysis ?? 'Profil archivé suite à l\'évaluation.',
        strengths: (app.Strengths ?? app.strengths ?? '').split(',').filter(Boolean),
        weaknesses: (app.Weaknesses ?? app.weaknesses ?? '').split(',').filter(Boolean),
        decision,
      };
    });

  const filteredCVs = archivedCVs.filter(cv =>
    cv.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cv.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cv.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 60) return 'text-[#EA580C]';
    return 'text-[#DC2626]';
  };

  // Ouvre la fiche ET charge la vraie analyse IA (points forts/faibles, compétences) :
  // ces champs n'existent pas sur la candidature elle-même, seul /api/Analysis les calcule.
  const openDetails = async (cv: ArchivedCV) => {
    setSelectedCV(cv);
    setShowDetailModal(true);
    setAnalysisLoading(true);
    try {
      const data = await api.get<any>(`/api/Analysis/${cv.id}`);
      if (data?.error) return;
      const update = (c: ArchivedCV): ArchivedCV => ({
        ...c,
        matchingScore: typeof data.matchingScore === 'number' && data.matchingScore > 0 ? Math.round(data.matchingScore) : c.matchingScore,
        skills: Array.isArray(data.skills) && data.skills.length ? data.skills : c.skills,
        strengths: Array.isArray(data.strengths) && data.strengths.length ? data.strengths : c.strengths,
        weaknesses: Array.isArray(data.weaknesses) && data.weaknesses.length ? data.weaknesses : c.weaknesses,
        summary: data.summary || c.summary,
      });
      setSelectedCV((prev) => (prev && prev.id === cv.id ? update(prev) : prev));
    } catch {
      // Analyse indisponible : on garde les infos déjà connues sans bloquer l'affichage.
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Restaure : remet la candidature en état "En attente" (idState=1) côté API
  const handleRestore = async (cv: ArchivedCV) => {
    try {
      await api.put(`/api/Application/UpdateState/${cv.id}?newState=1`);
      toast.success(`${cv.candidateName} restauré dans les candidatures actives`);
      setShowDetailModal(false);
      setSelectedCV(null);
      refetch();
    } catch {
      toast.error('Erreur lors de la restauration');
    }
  };

  const handleDelete = async (cv: ArchivedCV) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le CV de ${cv.candidateName} ?`)) return;
    try {
      await api.delete(`/api/Application/${cv.id}`);
      toast.success('CV supprimé définitivement');
      setShowDetailModal(false);
      setSelectedCV(null);
      refetch();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Archive className="w-8 h-8 text-[#DC2626]" />
            Candidatures archivées
          </h1>
          <p className="text-muted-foreground font-medium">
            Consultez les profils des candidats acceptés ou refusés avec leurs détails d'évaluation
          </p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="h-12 px-6 bg-secondary text-foreground rounded-2xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
        >
          Retour
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
            <p className="text-3xl font-bold mb-1">{archivedCVs.length}</p>
            <p className="text-xs opacity-90">CV archivés</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden bg-card/50 backdrop-blur-xl rounded-3xl p-3 border border-border/50 shadow-xl"
        >
          <div className="relative">
            <p className="text-3xl font-bold mb-1">
              {Math.round(archivedCVs.reduce((sum, cv) => sum + cv.matchingScore, 0) / archivedCVs.length)}%
            </p>
            <p className="text-xs text-muted-foreground">Score moyen</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden bg-card/50 backdrop-blur-xl rounded-3xl p-3 border border-border/50 shadow-xl"
        >
          <div className="relative">
            <p className="text-3xl font-bold mb-1">
              {new Set(archivedCVs.map(cv => cv.position)).size}
            </p>
            <p className="text-xs text-muted-foreground">Postes différents</p>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou poste..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button className="h-11 px-4 bg-card border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtres
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/30 border-b border-border">
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Candidat</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Poste</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Archivé le</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Matching</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCVs.map((cv, index) => (
                <motion.tr
                  key={cv.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-border/60 last:border-0 hover:bg-secondary/15 transition-colors"
                >
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="font-bold text-sm truncate">{cv.candidateName}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      {cv.candidateEmail}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[160px] truncate">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                      {cv.position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                      cv.decision === 'accepted' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#DC2626]/10 text-[#DC2626]'
                    }`}>
                      {cv.decision === 'accepted' ? 'Accepté' : 'Refusé'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {new Date(cv.archivedDate).toLocaleDateString('fr-FR')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold text-sm ${getScoreColor(cv.matchingScore)}`}>{cv.matchingScore}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openDetails(cv)}
                        title="Détails"
                        className="h-7 px-2.5 bg-gradient-to-br from-[#DC2626]/10 to-[#F87171]/10 border border-[#DC2626]/30 text-[#DC2626] rounded-lg font-medium hover:shadow-md transition-all flex items-center justify-center gap-1 text-[11px] whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Détails
                      </button>
                      <button
                        onClick={() => handleRestore(cv)}
                        title="Restaurer"
                        className="h-7 px-2.5 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-1 text-[11px] whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurer
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCVs.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">Aucun candidat archivé trouvé.</div>
        )}
      </div>

      {showDetailModal && selectedCV && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-2xl font-bold mb-1">{selectedCV.candidateName}</h2>
                <p className="text-muted-foreground">{selectedCV.position}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-10 h-10 bg-secondary hover:bg-secondary/80 rounded-lg flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gradient-to-br from-[#DC2626]/10 to-[#EF4444]/10 border border-[#DC2626]/20 rounded-2xl p-6">
                    <h3 className="font-semibold mb-3">Résumé du profil</h3>
                    <p className="text-sm leading-relaxed">
                      {analysisLoading ? 'Analyse IA en cours…' : selectedCV.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h3 className="font-semibold mb-4 text-[#16A34A]">Points forts</h3>
                      <div className="space-y-2">
                        {analysisLoading ? (
                          <p className="text-sm text-muted-foreground italic">Chargement…</p>
                        ) : selectedCV.strengths.length > 0 ? (
                          selectedCV.strengths.map((strength, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-[#16A34A] rounded-full mt-2" />
                              <span className="text-sm">{strength}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Aucun point fort identifié.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h3 className="font-semibold mb-4 text-[#DC2626]">Points d'attention</h3>
                      <div className="space-y-2">
                        {analysisLoading ? (
                          <p className="text-sm text-muted-foreground italic">Chargement…</p>
                        ) : selectedCV.weaknesses.length > 0 ? (
                          selectedCV.weaknesses.map((weakness, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-[#DC2626] rounded-full mt-2" />
                              <span className="text-sm">{weakness}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Aucun point d'attention identifié.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="font-semibold mb-4">Compétences</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisLoading ? (
                        <p className="text-sm text-muted-foreground italic">Chargement…</p>
                      ) : selectedCV.skills.length > 0 ? (
                        selectedCV.skills.map((skill, idx) => (
                          <span key={idx} className="px-4 py-2 bg-[#DC2626]/10 text-[#DC2626] rounded-lg text-sm font-medium">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Aucune compétence détectée.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={`rounded-2xl p-6 text-white bg-gradient-to-br ${
                    selectedCV.decision === 'accepted' ? 'from-[#16A34A] to-[#4ADE80]' : 'from-[#DC2626] to-[#F87171]'
                  }`}>
                    <h3 className="font-semibold mb-4">Score de matching</h3>
                    <div className="text-center">
                      <div className="text-5xl font-bold mb-2">{selectedCV.matchingScore}%</div>
                      <p className="text-sm opacity-90">
                        {selectedCV.decision === 'accepted' ? 'Candidat accepté' : 'En dessous du seuil (70%)'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="font-semibold mb-4">Informations</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Email</p>
                        <p className="font-medium">{selectedCV.candidateEmail}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Expérience</p>
                        <p className="font-medium">{selectedCV.experience}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Date d'archivage</p>
                        <p className="font-medium">
                          {new Date(selectedCV.archivedDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleRestore(selectedCV)}
                      className="w-full h-12 bg-[#16A34A] text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Restaurer
                    </button>
                    <button
                      onClick={() => handleDelete(selectedCV)}
                      className="w-full h-12 bg-error/10 text-error rounded-lg font-medium hover:bg-error/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      Supprimer définitivement
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
